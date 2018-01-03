// dependencies
import _ from 'lodash';

export function decodeMessageFromURL() {
  const message = decodeURIComponent(window.location.hash).replace(/#/g, '')
  return message
    ? JSON.parse(message)
    : { message: '' };
}

export function normalizeMessage(txt = '') {
  return txt.split(' ');
}

export function getRandomMessage() {
  return _.sample([
    'WELCOME',
    'TRY IT'
  ]);
}

export function copyToClipboard(text) {
  window.prompt(`Copy this URL and share your message with others`, text);
}