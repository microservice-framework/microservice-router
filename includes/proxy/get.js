import applyAccessToken from '../applyAccessToken.js';
import proxyRequest from './proxyRequest.js';
import doT from 'dot';

doT.templateSettings.strip = false;
let templatePath = './dist';
if (process.env.TEMPLATE_PATH) {
  templatePath = process.env.TEMPLATE_PATH;
}
const dots = doT.process({ path: templatePath, strip: false });

export default async function (recordId, request) {
  applyAccessToken(request);
  if (request.url == '') {
    let pkg = {
      version: 'x',
    };

    if (process.env.mfw_package_version) {
      pkg.version = process.env.mfw_package_version;
    } else if (process.env.npm_package_version) {
      pkg.version = process.env.npm_package_version;
    }

    if (process.env.mfw_package_name) {
      pkg.name = process.env.mfw_package_name;
    } else if (process.env.npm_package_name) {
      pkg.name = process.env.npm_package_name;
    }

    if (process.env.mfw_package_description) {
      pkg.description = process.env.mfw_package_description;
    } else if (process.env.npm_package_description) {
      pkg.description = process.env.npm_package_description;
    }

    let html = {
      version: pkg.version,
      scriptjs: 'var package=' + JSON.stringify(pkg) + ';',
    };
    return {
      code: 200,
      headers: {
        'content-type': 'text/html',
      },
      answer: dots.html(html),
    };
  }
  let cutPosition = request.url.lastIndexOf('/');
  let route = request.url.substring(0, cutPosition);
  let path = request.url.substring(cutPosition + 1);
  // Token verification for secure key
  if (route == 'auth' && request.isSecure && path == process.env.SECURE_KEY) {
    let responseHeaders = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, GET, OPTIONS, DELETE, PUT, SEARCH',
      'access-control-allow-headers': 'content-type, signature, access_token,' + ' token, Access-Token, scope, Scope',
      'access-control-expose-headers': 'x-total-count',
    };
    return {
      code: 200,
      answer: {
        expireAt: -1,
        secureKey: path,
      },
      headers: responseHeaders,
    };
  }
  return proxyRequest(
    {
      route: route,
      path: path,
      method: 'GET',
    },
    request
  );
}
