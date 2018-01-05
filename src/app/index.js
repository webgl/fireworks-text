// dependencies
import _ from 'lodash';
import TWEEN from 'tween.js';
import modal from 'sweetalert';

// make THREE global
window.THREE = require('three');
require('three/examples/js/modifiers/TessellateModifier');
require('three/examples/js/controls/OrbitControls');

// local dependencies
import {
  AMPLITUDE,
  CUSTOM_COLOR,
  DISPLACEMENT,
  OPACITY,
  fragmentShader,
  vertexShader
} from './shaders';
import * as helpers from './helpers';
import '../styles/main.scss';

const fontLoader = new THREE.FontLoader();

export default class App {

  constructor(message = {}, config) {
    // todo: clean config
    this.config = _.assign({}, {
      font: null,
      target: document.body,
      width: window.innerWidth,
      height: window.innerHeight,
      dpi: window.devicePixelRatio,
      lod: 0,
      textDisplayTime: 2000
    }, config);

    // todo: clean word indexing with HOF
    this.wordIndex = 0;
    // todo: normalizer
    this.message = helpers.normalizeMessage(message.message || helpers.getRandomMessage());
    this.name = message.name;

    return Promise.resolve()
    .then(this.initScene)
    .then(this.initUniforms)
    .then(this.loadFont)
    .then(this.openIntroModal)
    .then(this.renderMessage)
    .then(this.updateTransitions)
    .then(this.render);
  }

  initScene = () => {
    const { width, height, target, dpi } = this.config;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x110229);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(dpi);
    this.renderer.setSize(width, height);

    this.camera = new THREE.PerspectiveCamera(40, width / height, 1, 10000);
    this.controls = new THREE.OrbitControls(this.camera);

    target.appendChild(this.renderer.domElement);

    window.addEventListener('dblclick', this.explode, false);
    window.addEventListener('resize', this.onWindowResize, false);
    window.addEventListener('orientationchange', this.onWindowResize, false);

    // todo: refactor
    let lastTouch;
    window.addEventListener('touchend', () => {
      const now = new Date().getTime();
      const lastTime = now - lastTouch;
      if ((lastTime < 600) && (lastTime > 0)) {
        this.explode();
      }
      lastTouch = new Date().getTime();
    });
  };

  openIntroModal = () => {
    const NOTE = `NOTE: Optimized for desktop.`;
    return modal({
      icon: this.name && 'info',
      title: this.name && `You've got a message from ${this.name}!`,
      text: this.name ? `
        You can read the message in autoplay mode or
        read it in manual mode where you can double click
        to have the message explode and use mouse/touch
        to move around the scene.
        
        ${NOTE}
      ` : `
        Go ahead and write a message to share with others.
        You can double click to have the message explode
        and use mouse/touch to move around the scene.
        
        ${NOTE}
      `,
      buttons: this.name ? {
        Autoplay: { value: 1000  },
        Read: { value: Infinity }
      } : {
        OK: { value: Infinity }
      }
    })
    .then((val) => {
      this.config.textDisplayTime = val;
    });
  };

  updateTransitions = () => {
    _.each(this.transitions, (t) => t.start());
  };

  openShareModal = () => {
    return modal('Write and share a message of your own', { content: 'input', })
    .then((message) => {
      return modal('Your name', { content: 'input', })
      .then((name) => {
        window.location.hash = encodeURIComponent(JSON.stringify({
          name,
          message
        }));
        helpers.copyToClipboard(window.location.href);
        window.location.reload();
      });
    });
  };

  initUniforms = () => {
    this.uniforms = {
      [AMPLITUDE]: { value: 0 },
      [OPACITY]: { value: 1 }
    };
  };

  loadFont = () => {
    return new Promise((resolve) => {
      if (this.config.font) {
        return resolve();
      }
      fontLoader.load('./font.json', (font) => {
        this.config.font = font;
        resolve();
      });
    });
  };

  // todo: better word matching
  renderMessage = (msg) => {
    const { lod, textDisplayTime } = this.config;
    const message = msg || this.message[this.wordIndex];
    if (!message) return;
    this.text = message;

    let geometry = new THREE.TextGeometry(message, {
      font: this.config.font,
      size: 20,
      height: 5,
      curveSegments: 5,
      bevelThickness: 2,
      bevelSize: 1,
      bevelEnabled: true
    });

    geometry.center();

    const tessellateModifier = new THREE.TessellateModifier(1);
    _.times(lod, () => tessellateModifier.modify(geometry));

    const facesCount = geometry.faces.length;
    geometry = new THREE.BufferGeometry().fromGeometry(geometry);

    const color = new THREE.Color();
    const facesCountBufferLength = facesCount * 9;
    const colors = new Float32Array(facesCountBufferLength);
    const displacement = new Float32Array(facesCountBufferLength);

    _.times(facesCount, (i) => {
      const index = i * 9;
      color.setHSL(Math.random(), 1, Math.random());
      const d = (0.5 - Math.random()) * 5000;
      _.times(3, (j) => {
        colors[index + (3 * j)] = color.r;
        colors[index + (3 * j) + 1] = color.g;
        colors[index + (3 * j) + 2] = color.b;
        displacement[index + (3 * j)] = d;
        displacement[index + (3 * j) + 1] = d;
        displacement[index + (3 * j) + 2] = d;
      });
    });

    geometry.addAttribute(CUSTOM_COLOR, new THREE.BufferAttribute(colors, 3));
    geometry.addAttribute(DISPLACEMENT, new THREE.BufferAttribute(displacement, 3));

    const shaderMaterial = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      transparent: true
    });

    this.currentMessage = new THREE.Mesh(geometry, shaderMaterial);
    this.scene.add(this.currentMessage);

    this.camera.lookAt(geometry);
    this.camera.position.set(0, 0, Math.max(this.text.length, 4) * 15);

    this.transitions = [];
    const scale = { val: 0.0001 };
    const position = { y: -50 };
    const timer = { textDisplayTime };

    this.currentMessage.scale.set(scale.val, scale.val, scale.val);
    this.currentMessage.position.setY(position.y);

    this.transitions.push(
      new TWEEN.Tween(scale)
      .to({ val: 1 }, 1300)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        this.currentMessage.scale.set(scale.val, scale.val, scale.val);
      }),
      new TWEEN.Tween(position)
      .to({ y: 0 }, 800)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        this.currentMessage.position.setY(position.y);
      }),
      new TWEEN.Tween(timer)
      .to({ textDisplayTime: 0 }, textDisplayTime)
      .onComplete(this.explode)
    );
  };

  explode = () => {
    this.isExploding = true;
  };

  // todo: cleaner resets
  resetFont = () => {
    if (this.finished) return;
    this.scene.remove(this.currentMessage);
    this.uniforms[AMPLITUDE].value = 0;
    this.uniforms[OPACITY].value = 1;
    this.currentMessage = null;
    this.isExploding = false;
    this.wordIndex++;
    const word = this.message[this.wordIndex];
    requestAnimationFrame(() => {
      if (word) {
        this.renderMessage(word);
        this.updateTransitions();
      } else {
        this.finished = true;
        this.openShareModal();
      }
    });
  };

  // todo: test on various sizes
  onWindowResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.config.width = width;
    this.config.height = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  // todo: break into separate components
  updateTextPosition = (d) => {
    const amplitude = this.uniforms[AMPLITUDE].value;
    if (this.isExploding) {
      this.uniforms[AMPLITUDE].value = amplitude + 0.01;
    }
    else if (this.currentMessage) {
      this.uniforms[AMPLITUDE].value = Math.sin(d / 500) / 2000;
      this.currentMessage.position.setX(Math.sin(d / 800));
      this.currentMessage.position.setZ(Math.cos(d / 400));
    }
  };

  updateTextOpacity = (d) => {
    if (this.isExploding) {
      this.uniforms[OPACITY].value -= 0.03;
    }
    if (this.uniforms[OPACITY].value <= 0) {
      this.resetFont();
    }
  };

  updateCamera = () => {
    if (this.text) {
      const messageLength = this.text.length;
      const { x, y, z } = this.camera.position;
      this.camera.position.set(
        x,
        Math.max(messageLength * -5, y - 0.5),
        Math.min(Math.max(messageLength, 4) * 15, z + 0.7)
      );
    }
  };

  animate = (d) => {
    TWEEN.update(d);
    this.controls.update();

    _.each([
      this.updateTextPosition,
      this.updateTextOpacity,
      this.updateCamera
    ], (cb) => cb(d));
  };

  render = (d = 0) => {
    requestAnimationFrame(this.render);
    this.renderer.render(this.scene, this.camera);
    this.animate(d);
  };

}