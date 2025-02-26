/**
 * decode buffer to specidied by content-type format.
 */
export default function (contentType, buffer) {
  let data = false;
  switch (contentType) {
    case undefined: // version 1.x compatibility. If no content-type provided, assume json.
    case 'application/json': {
      data = JSON.parse(buffer);
      break;
    }
    // Todo support more decoders here?
    default: {
      data = buffer;
    }
  }
  return data;
}
