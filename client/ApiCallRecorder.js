const ApiCallRecorderServer = require('./server/ApiCallRecorderServer');

module.exports = (handler) => (
  event,
  context
) => {
  const wrappedHandler = async (event, context)=> {
    // Instantiate API Call Recorder Server
    const apiCallRecorderServer = new ApiCallRecorderServer();
    // Store expection(s)
    let exception;
    // Statistics
    let handlerStartTimestamp, handlerStopTimestamp, recordingStartTimestamp, recordingStopTimestamp,
      uploadStartTimestamp, uploadStopTimestamp;
    recordingStartTimestamp = new Date().getTime();
    try {
      // Start API Call Recorder Server
      await apiCallRecorderServer.start();
      // Execute original handler function
      handlerStartTimestamp = new Date().getTime();
      const response = await handler(event, context);
      handlerStopTimestamp = new Date().getTime();
      return response;
    } catch (e) {
      exception = e;
    } finally {
      try {
        // Wait for last API calls to arrive
        await new Promise(resolve => setTimeout(resolve, 25));
        // Stop API Call Recorder Server
        await apiCallRecorderServer.stop();
        recordingStopTimestamp = new Date().getTime();
        // Upload API Call Recorder Server logged calls
        uploadStartTimestamp = new Date().getTime();
        await apiCallRecorderServer.upload();
        uploadStopTimestamp = new Date().getTime();
        // Log statistics
        console.log({ 
          recordingDuration: (recordingStopTimestamp-recordingStartTimestamp),
          handlerDuration: (handlerStopTimestamp-handlerStartTimestamp),
          uploadingDuration: (uploadStopTimestamp-uploadStartTimestamp)
        });
      } catch (e) {
        console.log('Error occured: ', e);
      }
    }
    if (exception) {
      throw exception;
    }
    return;
  };
  return wrappedHandler(event, context);
}
