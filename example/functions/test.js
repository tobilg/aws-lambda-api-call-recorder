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
