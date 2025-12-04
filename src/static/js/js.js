import * as THREE from "./libs/three.module.js"
import { OrbitControls } from "./libs/OrbitControls.js"

/*Creamos escena*/
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xffffff, 0.02)

/*Creamos camara*/
const camara = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 1, 1000);
camara.position.z = 12.5; 

/*Creamos renderer*/
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xffffff, 1);
document.body.appendChild(renderer.domElement);

/*Creamos luz ambiente*/
const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(luzAmbiente);

/*Creamos luz direccional*/
const luzDireccional = new THREE.DirectionalLight(0xffffff, 0.7);
luzDireccional.position.z = 10;
luzDireccional.position.x = 10;
luzDireccional.position.y = 10;
scene.add(luzDireccional);

/*Controles de rotacion*/
const control = new OrbitControls(camara, renderer.domElement);
control.autoRotate = true;
control.autoRotateSpeed = 0.85;
control.enableDamping = true;
control.dampingFactor = 0.1;

/*La tierra*/
const tradio = 5
const textureLoader = new THREE.TextureLoader();
const tgeo = new THREE.SphereGeometry(tradio, 64, 64);
const tmat = new THREE.MeshPhongMaterial({map: textureLoader.load("static/img/earth.jpg"), shininess: 1, specular: 0xffffff});
const tmesh = new THREE.Mesh(tgeo, tmat);
scene.add(tmesh);

/*Pasar de latitud y longitud a una posicion de la superficie de la Tierra*/
function llVector(lat, lon, r) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(r * Math.sin(phi) * Math.cos(theta));
    const z = (r * Math.sin(phi) * Math.sin(theta));
    const y = (r * Math.cos(phi));
    return new THREE.Vector3(x, y, z);
}

/*Calculamos una altura dinámica para las curvas de bezier en función de la distancia que hay entre los puntos*/
function calcAltura(pos1, pos2){
    const medio = pos1.clone().add(pos2).multiplyScalar(0.5);
    medio.normalize(); //Hacemos que su módulo valga uno con la misma dirección 
    const alturaExtra = pos1.distanceTo(pos2) * 0.7;
    medio.multiplyScalar(tradio + alturaExtra);
    return medio;
}

var lineasMap = [];

/*Obtenemos los valores de la base de datos*/ 
fetch("/api/mapa")
    .then(response => response.json())
    .then(data => {
        console.log(data)
        /*Circulos*/
        const cgeo = new THREE.SphereGeometry(.05, 20, 20);
        const cmat = new THREE.MeshBasicMaterial({color: 0xC73A1E});
        const cauxgeo = new THREE.SphereGeometry(.10, 20, 20);
        const cauxmat = new THREE.MeshBasicMaterial({color: 0xEB8D7A, transparent:true, opacity: 0.3});

        data.ciudades.forEach(ciudad =>{
            const cposicion = llVector(ciudad.lat, ciudad.lon, tradio);
            const cmesh = new THREE.Mesh(cgeo, cmat);
            const cauxmesh = new THREE.Mesh(cauxgeo, cauxmat);
            cmesh.position.copy(cposicion);
            cauxmesh.position.copy(cposicion);
            scene.add(cmesh);
            scene.add(cauxmesh);
        });

        var i = 0;

        /*Curva Bezier*/
        data.conexiones.forEach(conexion =>{
            const conpos1 = llVector(conexion.lat1, conexion.lon1, tradio);
            const conpos2 = llVector(conexion.lat2, conexion.lon2, tradio);
            const altura = calcAltura(conpos1, conpos2);
            const bcurva = new THREE.QuadraticBezierCurve3(conpos1, altura, conpos2);
            const bcpuntos = bcurva.getPoints(50);
            const bcmat = new THREE.LineBasicMaterial({color: 0xFF21E3});
            const bcgeo = new THREE.BufferGeometry().setFromPoints(bcpuntos);
            const bcmesh = new THREE.Line(bcgeo, bcmat);
            
            lineasMap[i] = bcmesh;
            i++;
            
            scene.add(bcmesh);
        })

    });

/*Funcion recursiva para crear la animacion*/ 
function animate(){
    requestAnimationFrame(animate);
    control.update();
    renderer.render(scene, camara);
}
animate()

/*Hacemos que cuando cambie el tamaño de la pestaña todo funcione bien*/
window.addEventListener("resize", ()=>{
    camara.aspect = window.innerWidth / window.innerHeight;
    camara.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const tabla = document.getElementById("tabla").addEventListener("click", (e)=>{
    const fila = e.target.closest("tr");
    if(fila){
        if(fila.classList.contains("seleccionada")){
            fila.classList.remove("seleccionada");
            lineasMap[fila.id - 1].material.color.setHex(0xFF21E3);
        }else{
            fila.classList.add("seleccionada");
            lineasMap[fila.id - 1].material.color.setHex(0x000000);
        }
    }
});
