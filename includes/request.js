import debug from './debug.js';

export default async function (requestOptions) {
  if (requestOptions.headers === undefined) {
    requestOptions.headers = {};
  }

  // Validate URI
  try {
    new URL(requestOptions.url);
  } catch (err) {
    return err;
  }

  // disable parse JS
  requestOptions.transformResponse = (x) => x;

  debug.debug('requestOptions', requestOptions);

  return axios
    .request(requestOptions)
    .then(function (response) {
      debug.debug('request', requestOptions);
      debug.debug('response', response);
      debug.log(requestOptions.method.toUpperCase(), requestOptions.url, response.status);
      return {
        code: response.status,
        answer: response.data,
        headers: JSON.parse(JSON.stringify(response.headers)),
      };
    })
    .catch(function (error) {
      debug.debug('catch', error.request);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        debug.log(requestOptions.method.toUpperCase(), requestOptions.url, error.response.status, error.response.data.message);
        return {
          code: error.response.status,
          error: error.response.data,
          headers: JSON.parse(JSON.stringify(error.response.headers)),
        };
      } else {
        return {
          code: 500,
          error,
        };
      }
    });
}
