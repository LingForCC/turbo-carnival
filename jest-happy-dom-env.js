/**
 * Custom Jest environment for Happy DOM
 * This is needed for Happy DOM v15+ with Jest projects
 */

const { Window } = require('happy-dom');
const NodeEnvironment = require('jest-environment-node').default;

class HappyDOMEnvironment extends NodeEnvironment {
  constructor(config) {
    super(config);
    this.happyWindow = new Window({
      url: config.testEnvironmentOptions?.url || 'http://localhost:3000/',
      width: 1024,
      height: 768,
      settings: {
        disableJavaScriptEvaluation: false,
        disableCSSFileLoading: true,
        disableIframePageLoading: true,
      },
    });

    // Define global properties
    this.global.window = this.happyWindow;
    this.global.document = this.happyWindow.document;
    this.global.navigator = this.happyWindow.navigator;
    this.global.HTMLElement = this.happyWindow.HTMLElement;
    this.global.Event = this.happyWindow.Event;
    this.global.CustomEvent = this.happyWindow.CustomEvent;
    this.global.TextDecoder = this.happyWindow.TextDecoder;
    this.global.TextEncoder = require('util').TextEncoder;
    this.global.self = this.global;

    // IMPORTANT: Set customElements globally for Web Components
    this.global.customElements = this.happyWindow.customElements;
  }

  async setup() {
    await super.setup();
    // Any additional setup before tests run
  }

  async teardown() {
    // Any cleanup after tests run
    if (this.happyWindow) {
      this.happyWindow.close();
    }
    await super.teardown();
  }

  getVmContext() {
    return super.getVmContext();
  }
}

module.exports = HappyDOMEnvironment;
