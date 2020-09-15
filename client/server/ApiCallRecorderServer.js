const udp = require('dgram');
const { Firehose } = require('aws-sdk');

const firehose = new Firehose({
  apiVersion: '2015-08-04',
  region: process.env.AWS_REGION || 'us-east-1'
});

class ApiCallRecorderServer {
  constructor (firehoseDeliveryStreamName, logger, port = 31000) {
    // Create UDP server socket
    this.udpServer = udp.createSocket('udp4');
    
    // Set UDP server port
    this.port = port;

    // Define logger
    this.logger = logger || {
      info: console.log,
      warn: console.log,
      error: console.error,
      trace: console.log,
      debug: console.log
    }

    // Check if the recording is activated
    this.isActivated = process.env.NODE_ENV === 'development' || !!(process.env.API_CALL_RECORDER_IS_ACTIVATED === 'true');

    // Store Firehose DeliveryStream name
    this.firehoseDeliveryStreamName = firehoseDeliveryStreamName || process.env.API_CALL_RECORDER_DELIVERY_STREAM_NAME;

    // Store messages
    this.queue = [];

    // Event handlers
    this.udpServer.on('message', this.handleMessage.bind(this));
    this.udpServer.on('error', this.handleError.bind(this));
  }

  handleError (error) {
    this.logger.error('Error: ' + error);
    this.udpServer.close();
  }

  async handleMessage (msg, info) {
    // Add to queue
    this.queue.push(JSON.parse(msg.toString()));
  }

  async start () {
    let self = this;
    if (!self.isActivated) {
      return Promise.resolve();
    } else {
      return new Promise((resolve, reject) => {
        // Startup event listener
        self.udpServer.on('listening', function() {
          const address = self.udpServer.address();
          self.logger.debug(`UDP server started on port ${address.port}`);
          resolve();
        });
        // Start server
        self.udpServer.bind(self.port);
      });
    }
  }

  async stop () {
    let self = this;
    if (!self.isActivated) {
      return Promise.resolve();
    } else {
      return new Promise((resolve, reject) => {
        // Shutdown event listener
        this.udpServer.on('close',function(){
          self.logger.debug(`UDP server stopped on port ${self.port}`);
          resolve();
        });
        // Shutdown server
        self.udpServer.close();
      });
    }
  }

  async upload () {
    // Check if something is in the queue, if not resolve
    if (this.queue.length === 0 || !this.isActivated) {
      this.logger.debug('No API calls to upload');
      return Promise.resolve();
    } else {
      this.logger.debug(`${this.queue.length} API calls to upload`);
      return firehose.putRecordBatch({
        DeliveryStreamName: this.firehoseDeliveryStreamName,
        Records: this.queue.map(item => {
          // Add Lambda function name
          item.functionName = process.env.AWS_LAMBDA_FUNCTION_NAME || null;
          return {
            Data: `${JSON.stringify(item)}\n`
          }
        })
      }).promise();
    }
  }
}

module.exports = ApiCallRecorderServer;
