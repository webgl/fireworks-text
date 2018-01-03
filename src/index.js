// local dependencies
import NewYearApp from './app';
import { decodeMessageFromURL } from "./app/helpers";

// create new instance of application
new NewYearApp(decodeMessageFromURL(), {
  target: document.getElementById('root')
});