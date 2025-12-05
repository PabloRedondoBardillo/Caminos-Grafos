import * as THREE from "./libs/three.module.js"
import { OrbitControls } from "./libs/OrbitControls.js"

/*Varibales generales*/
const displacementScaleFactor = 0.15;
const bulgingScaleFactor = 0.55;

/*Creamos escena*/
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xffffff, 0.02)
scene.background = new THREE.Color(0xffffff) 

/*Creamos camara*/
const camara = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 1, 1000);
camara.position.z = 12.5; 

/*Creamos renderer*/
const renderer = new THREE.WebGLRenderer({antialias: true, alpha: false});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0xffffff, 1);
renderer.domElement.id = 'canvas';
document.body.appendChild(renderer.domElement);

/*Creamos luz ambiente*/
const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(luzAmbiente);

/*Creamos luz direccional*/
const luzDireccionalA = new THREE.DirectionalLight(0xffffff, 0.7);
luzDireccionalA.position.z = 10;
luzDireccionalA.position.x = 10;
luzDireccionalA.position.y = 10;
scene.add(luzDireccionalA);
const luzDireccionalB = new THREE.DirectionalLight(0xffffff, 0.7);
luzDireccionalB.position.z = 10;
luzDireccionalB.position.x = -10;
luzDireccionalB.position.y = -10;
scene.add(luzDireccionalB);

/*Controles de rotacion*/
const control = new OrbitControls(camara, renderer.domElement);
control.autoRotate = true;
control.autoRotateSpeed = 0.85;
control.enableDamping = true;
control.dampingFactor = 0.1;

/*La tierra*/
const tradio = 5
const textureLoader = new THREE.TextureLoader();
const tgeo = new THREE.SphereGeometry(tradio, 256, 256);
const tmat = new THREE.MeshStandardMaterial({
    map: textureLoader.load("static/img/earth_basic.jpg"),
    displacementMap: textureLoader.load("static/img/earth_topography.png"),
    displacementScale: displacementScaleFactor,
    normalMap: textureLoader.load("static/img/earth_normal.jpg"),
    normalScale: new THREE.Vector2(1, 1),
    roughnessMap: null,
    roughness: 1,
    metalness: 0
});
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


function informacionImagen(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    return context.getImageData(0,0,image.width, image.height);
}

function conseguirAlturaNueva(lat, lon, informacionImagen) {
    let u = (lon + 180) / 360;
    let v = (90 - lat) / 180;
    //v = 1 - v podemos invertir las coordenadas en el eje OX
    const x = Math.floor(u * (informacionImagen.width - 1));
    const y = Math.floor(v * (informacionImagen.height - 1));
    const index = (y * informacionImagen.width + x) * 4;
    return informacionImagen.data[index] / 255;
}

/*Calculamos una altura dinámica para las curvas de bezier en función de la distancia que hay entre los puntos*/
function calcAlturaBezier(pos1, pos2){
    const medio = pos1.clone().add(pos2).multiplyScalar(0.5);
    medio.normalize(); //Hacemos que su módulo valga uno con la misma dirección 
    const alturaExtra = pos1.distanceTo(pos2) * bulgingScaleFactor;
    medio.multiplyScalar(tradio + alturaExtra);
    return medio;
}

var lineasMap = [];
var puntosCiudades = [];
var ciudades = [];

/*Obtenemos los valores de la base de datos*/ 
fetch("/api/mapa")
    .then(response => response.json())
    .then(data => {
        /*Asignación de variables para su uso después*/
        ciudades = data.ciudades;
        
        /*Cargamos la imagen de la topografia para sacar las alturas nuevas*/
        const elevacionImagen = new Image();
        elevacionImagen.src = 'static/img/earth_topography.png';
        elevacionImagen.onload = function() {
            
            const informacionAltura = informacionImagen(elevacionImagen);

            /*Circulos*/
            data.ciudades.forEach(ciudad =>{
                const cgeo = new THREE.SphereGeometry(.05, 20, 20);
                const cmat = new THREE.MeshBasicMaterial({color: 0xC73A1E});
                const cauxgeo = new THREE.SphereGeometry(.10, 20, 20);
                const cauxmat = new THREE.MeshBasicMaterial({color: 0xEB8D7A, transparent:true, opacity: 0.3});
                const radioModificado = tradio + (conseguirAlturaNueva(ciudad.lat,ciudad.lon, informacionAltura) * displacementScaleFactor);
                const cposicion = llVector(ciudad.lat, ciudad.lon, radioModificado);
                const cmesh = new THREE.Mesh(cgeo, cmat);
                const cauxmesh = new THREE.Mesh(cauxgeo, cauxmat);
                cmesh.position.copy(cposicion);
                cauxmesh.position.copy(cposicion);
                
                puntosCiudades[ciudad.id - 1] = [cmesh, cauxmesh];

                scene.add(cmesh);
                scene.add(cauxmesh);
            });

            /*Curva Bezier*/
            data.conexiones.forEach(conexion =>{
                const radioModificado1 = tradio + (conseguirAlturaNueva(conexion.lat1,conexion.lon1, informacionAltura) * displacementScaleFactor);
                const radioModificado2 = tradio + (conseguirAlturaNueva(conexion.lat2,conexion.lon2, informacionAltura) * displacementScaleFactor);
                const conpos1 = llVector(conexion.lat1, conexion.lon1, radioModificado1);
                const conpos2 = llVector(conexion.lat2, conexion.lon2, radioModificado2);
                const altura = calcAlturaBezier(conpos1, conpos2);
                const bcurva = new THREE.QuadraticBezierCurve3(conpos1, altura, conpos2);
                const bcpuntos = bcurva.getPoints(50);
                const bcmat = new THREE.LineBasicMaterial({color: 0xFF21E3});
                const bcgeo = new THREE.BufferGeometry().setFromPoints(bcpuntos);
                const bcmesh = new THREE.Line(bcgeo, bcmat);
                
                lineasMap[conexion.id - 1] = bcmesh;
                
                scene.add(bcmesh);
            });            
        }
    });

/*Funcion recursiva para crear la animacion*/ 
function animate(){
    requestAnimationFrame(animate);
    control.update();
    renderer.clear();
    renderer.render(scene, camara);
}
animate()

/*Hacemos que cuando cambie el tamaño de la pestaña todo funcione bien*/
window.addEventListener("resize", ()=>{
    camara.aspect = window.innerWidth / window.innerHeight;
    camara.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


/*Cambiamos el color de las rutas*/
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

/*Buscador*/
const buscador = document.getElementById("buscador");
const botonBuscador = document.getElementById("botonBuscador");
const lista = document.getElementById("lista_buscador");
const listaBuscando = document.getElementById("lista_buscando");
const maxHijos = 5;

botonBuscador.addEventListener("click", ()=>{
    ciudades.forEach(ciudad =>{
        if(ciudad.nombre.toLowerCase().includes(buscador.value.toLowerCase()) && !lista.querySelector("#" + ciudad.nombre)){
            const nuevoLi = document.createElement("li");
            const nuevoP = document.createElement("p");
            const nuevoBut = document.createElement("button");
            nuevoP.textContent = ciudad.nombre;
            nuevoBut.textContent = "x";
            nuevoLi.appendChild(nuevoP);
            nuevoLi.appendChild(nuevoBut);
            nuevoLi.classList.add("elemento_lista");
            nuevoLi.id = ciudad.nombre;

            lista.appendChild(nuevoLi);

            puntosCiudades[ciudad.id - 1][0].material.color.setHex(0xF3FF0F);
            puntosCiudades[ciudad.id - 1][1].material.color.setHex(0xFAFFB5);

            nuevoBut.addEventListener("click", ()=>{
                nuevoLi.remove();
                puntosCiudades[ciudad.id - 1][0].material.color.setHex(0xC73A1E);
                puntosCiudades[ciudad.id - 1][1].material.color.setHex(0xEB8D7A);
            });
        }
    });
});

buscador.addEventListener("input", ()=>{
    const listaAgregar = []
    listaBuscando.innerHTML = "";
    if(buscador.value !== ''){
        ciudades.forEach(ciudad =>{
            if(ciudad.nombre.toLowerCase().includes(buscador.value.toLowerCase()) && listaAgregar.length < maxHijos){
                
                const nuevoLi = document.createElement("li");
                const nuevoP = document.createElement("p");
                nuevoP.textContent = ciudad.nombre;
                nuevoLi.appendChild(nuevoP);
                
                listaAgregar[listaAgregar.length] = nuevoLi;
            }
        })

        listaAgregar.forEach(li =>{
            listaBuscando.appendChild(li);
            li.addEventListener("click", ()=>{

            });
        });
    }
});