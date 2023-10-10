import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

let scene, renderer, camera, stats, animationGroup;
let model, mixer, clock;
let currentAvatar;

let singleStepMode = false;
let sizeOfNextStep = 0;

// Define global variables for your animation actions
let idleAction, walkAction, runAction;
function changeToWalkPose() {
  // Add your code to change to the walk pose here
  console.log("Walk Pose clicked");
}

function changeToRunPose() {
  // Add your code to change to the run pose here
  console.log("Run Pose clicked");
}

function changeToIdlePose() {
  // Add your code to change to the idle pose here
  console.log("Idle Pose clicked");
}

// Attach these functions to the window object
window.changeToWalkPose = changeToWalkPose;
window.changeToRunPose = changeToRunPose;
window.changeToIdlePose = changeToIdlePose;

async function loadAvatar(url) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);

  model = gltf.scene;

  scene.add(model);

  model.traverse(function (object) {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
      object.material.envMapIntensity = 0.3;
    }
  });

  animationGroup.add(model);

  return model;
}

function filterAnimation(animation) {
  animation.tracks = animation.tracks.filter((track) => {
    const name = track.name;
    return name;
  });
  console.log(animation);
  return animation;
}

async function init() {
  const container = document.getElementById("container");

  // Adjust the aspect ratio to maintain full height while reducing width to half
  const aspectRatio = window.innerWidth / 2 / window.innerHeight;

  camera = new THREE.PerspectiveCamera(45, aspectRatio, 1, 1000);
  camera.position.set(-2, 1, 3);
  camera.lookAt(0, 1, 0);

  clock = new THREE.Clock();
  animationGroup = new THREE.AnimationObjectGroup();
  mixer = new THREE.AnimationMixer(animationGroup);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff);
  dirLight.position.set(-3, 10, -10);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 2;
  dirLight.shadow.camera.bottom = -2;
  dirLight.shadow.camera.left = -2;
  dirLight.shadow.camera.right = 2;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 40;
  scene.add(dirLight);

  new RGBELoader().load(
    "public/brown_photostudio_01.hdr",
    (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = texture;
    },
    (texture) => {},
    (texture) => {}
  );

  // ground

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add(mesh);

  currentAvatar = await loadAvatar("public/default_model.glb");

  const loader = new GLTFLoader();
  loader.load("public/typing.glb", function (gltf) {
    const clip = filterAnimation(gltf.animations[0]);
    const action = mixer.clipAction(clip);

    // Store the actions in your global variables
    idleAction = action;
    idleAction.play(); // Start with the idle animation
  });

  // Adjust the size of the renderer to half of the screen's width
  const halfScreenWidth = window.innerWidth / 2;
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(halfScreenWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  stats = new Stats();
  container.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize);

  animate();
}

function onWindowResize() {
  // Adjust the camera's aspect ratio on window resize to maintain full height
  const aspectRatio = window.innerWidth / 2 / window.innerHeight;
  camera.aspect = aspectRatio;
  camera.updateProjectionMatrix();

  // Adjust the size of the renderer to half of the screen's width
  const halfScreenWidth = window.innerWidth / 2;
  renderer.setSize(halfScreenWidth, window.innerHeight);
}

function animate() {
  // Render loop

  requestAnimationFrame(animate);

  // Get the time elapsed since the last frame, used for mixer update (if not in single step mode)

  let mixerUpdateDelta = clock.getDelta();

  // If in single step mode, make one step and then do nothing (until the user clicks again)

  if (singleStepMode) {
    mixerUpdateDelta = sizeOfNextStep;
    sizeOfNextStep = 0;
  }

  // Update the animation mixer, the stats panel, and render this frame

  mixer.update(mixerUpdateDelta);

  stats.update();

  renderer.render(scene, camera);
}

async function subscribe(event) {
  /* Here we process the events from the iframe */

  let json;
  try {
    json = JSON.parse(event.data);
  } catch (error) {
    console.log("Error parsing the event data.");
    return;
  }

  if (json.source !== "avaturn") {
    return;
  }

  // Get avatar GLB URL
  if (json.eventName === "v2.avatar.exported") {
    loadAvatar(json.data.url).then((model) => {
      currentAvatar.visible = false;
      currentAvatar = model;
    });
  }
}

window.addEventListener("message", subscribe);

await init();
