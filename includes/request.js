import debug from './debug.js';

export default async function () {
  const config = {
    baseURL: settings.URL,
    headers: {},
  };
  if (settings.headers) {
    config.headers = settings.headers;
  }
  if (settings.accessToken) {
    config.headers['Access-Token'] = settings.accessToken;
  }

  // If we are running under node, set version User-agent.
  if (process && process.env && process.env.npm_package_version) {
    config.headers['User-Agent'] = 'MicroserviceClient.' + process.env.npm_package_name + '.' + process.env.npm_package_version;
  }

  if (reqOptions.headers === undefined) {
    reqOptions.headers = {};
  }

  const signatureMethods = ['PUT', 'SEARCH', 'PATCH', 'POST', 'OPTIONS'];

  if (this.settings.secureKey && signatureMethods.indexOf(reqOptions.method.toUpperCase()) !== -1) {
    const hash = await signature(JSON.stringify(reqOptions.data), this.settings.secureKey);
    reqOptions.headers.signature = 'sha256=' + hash;
    reqOptions.headers['Access-Token'] = false;
  }

  debug.debug('reqOptions', reqOptions);

  return axios
    .create(config)
    .request(reqOptions)
    .then(function (response) {
      debug.debug('request', response.config.headers);
      debug.debug('response', response);
      debug.log(response.config.method.toUpperCase(), response.config.url, response.status);
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
        debug.log(error.response.config.method.toUpperCase(), error.response.config.url, error.response.status, error.response.data.message);
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
