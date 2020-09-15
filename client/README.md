# aws-lambda-api-call-recorder
Client for the recording of AWS API calls in Node-based Lambda functions, leveraging AWS Client Side Monitoring.

## Why does this project exist?

Mainly curiosity. But also because AWS CloudTrail doesn't record all API calls, thus it's possible to gather more insights how your Lambda functions behave.

Also, it's possible to determine the latencies of the API calls of different AWS services.

## Preconditions

To be able to use the client library, you need to have the [backend installed](https://github.com/tobilg/aws-lambda-api-call-recorder) in the AWS account you want to record the AWS SDK API calls. Please see the appropriate backend section in the [README](https://github.com/tobilg/aws-lambda-api-call-recorder/README.md).

### Installation

To install the client library, just do the following:

```bash
$ npm i --save aws-lambda-api-call-recorder
```

### Usage

To use the client library, you can wrap you handler function with `ApiCallRecorder`:

```javscript
const AWS = require('aws-sdk');
const ApiCallRecorder = require('aws-lambda-api-call-recorder');

const sts = new AWS.STS();

const handler = async (event, context) => {
  console.log(event);
  console.log(context);
  const callerIdentity = await sts.getCallerIdentity({}).promise();
  console.log(callerIdentity);
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ok: true
    })
  };
}

exports.handler = ApiCallRecorder(handler);
```

Also, you will have to set the following environment variables to enable the detailled AWS SDK API Call recording:

* `AWS_CSM_ENABLED`: This environment variable should be set to `true` 
* Either `NODE_ENV` needs to be set to `development`, or, in case you want `production`, you can additionally set `API_CALL_RECORDER_IS_ACTIVATED` to `true`
* `API_CALL_RECORDER_DELIVERY_STREAM_NAME` needs to be set to the name of the Kinesis DeliveryStream. In case you use the Serverless framework and already installed the backend, you should be able to use the backed stack's output for this: `${cf:api-call-recorder-backend-${self:provider.stage}.ApiCallRecorderDeliveryStreamName}`

**Hints**:  
* Running production workloads with the `APICallRecorder` enabled is not advise, because it will add latency (and hence, costs)
* The `APICallRecorder` will **NOT** log the final upload of the recorded events to the Firehose DeliveryStream

### How it works

The client will wrap the Node Lambda function handler, start a UDP server on `localhost` on port `31000`, so that it can receive the published messages of the [AWS Client Side Monitoring](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/metrics.html) (CSM). Once the wrapped handler functions completes, the UDP server will be kept running another 25ms to make sure all API calls can be recorded. After it's shut down, the API calls will be pushed to a Kinesis Firehose DeliveryStream, which will batch the events to gzipped files in S3. 

Those files in S3 are then made queryable in Athena by an appropriate Glue Table definition.
