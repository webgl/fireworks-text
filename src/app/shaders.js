export const AMPLITUDE = `amplitude`;
export const OPACITY = `opacity`;
export const CUSTOM_COLOR = `customColor`;
export const DISPLACEMENT = `displacement`;

export const vertexShader = `
  uniform float ${AMPLITUDE};
  uniform float ${OPACITY};
  attribute vec3 ${CUSTOM_COLOR};
  attribute vec3 ${DISPLACEMENT};
  varying vec3 vNormal;
  varying vec3 vColor;
  varying float vOpacity;
  
  void main() {
    vColor = ${CUSTOM_COLOR};
    vOpacity = ${OPACITY};
    vNormal = normal;
    vec3 newPosition = position + normal * ${DISPLACEMENT} * ${AMPLITUDE};
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

export const fragmentShader = `
  varying vec3 vNormal;
  varying vec3 vColor;
  varying float vOpacity;
  
  void main() {
    const float ambient = 0.3;
    vec3 light = vec3(1.0);
    light = normalize(light);
    float directional = max(dot(vNormal, light), 0.0);
    gl_FragColor = vec4((directional + ambient) * vColor, vOpacity);
  }
`;