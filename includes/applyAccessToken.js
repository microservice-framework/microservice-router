export default function (request) {
  if (request.url.indexOf('?') != -1) {
    let cutPosition = request.url.lastIndexOf('?');
    let accessToken = request.url.substring(cutPosition + 1);
    request.url = request.url.substring(0, cutPosition);
    if (!accessToken || accessToken == '') {
      return;
    }
    console.log('TEST', accessToken, process.env.SECURE_KEY);
    if (accessToken != process.env.SECURE_KEY) {
      request.headers.access_token = accessToken;
      request.headers['access-token'] = accessToken;
    } else {
      request.isSecure = true;
      request.SecureKey = accessToken;
    }
  } else {
    let accessToken = false;
    if (request.headers['access-token']) {
      accessToken = request.headers['access-token'];
    }
    if (request.headers['access_token']) {
      accessToken = request.headers['access_token'];
    }
    if (accessToken && request.headers['access-token'] == process.env.SECURE_KEY) {
      request.isSecure = true;
      request.SecureKey = accessToken;
      delete request.headers['access-token'];
      delete request.headers['access_token'];
    }
  }
}
