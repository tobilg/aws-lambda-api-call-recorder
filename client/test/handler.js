const ApiCallRecorder = require('../ApiCallRecorder');

const handler = async (event, context) => {
  console.log("In handler");
  const a = await new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log("Timeout finished")
      resolve();
    }, 10000)
  });
  return a;
}

module.exports = ApiCallRecorder(handler);
