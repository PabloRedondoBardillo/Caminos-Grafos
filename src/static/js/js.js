import * as THREE from "./libs/three.module.js"
import { OrbitControls } from "./libs/OrbitControls.js"

/*Constantes y configuracion*/
const CONFIG = {
    displacementScaleFactor: 0.15,
    bulgingScaleFactor: 0.55,
    radioTierra: 5,
    posicionCamaraZ: 12.5,
    colorFog: 0xffffff,
    colorBg: 0xffffff,
    colorLuz: 0xffffff,
    velocidadRotacion: 0.55
};

const DOM = {
    tabla: document.getElementById("tabla"),
    buscador: document.getElementById("buscador"),
    botonBuscador: document.getElementById("botonBuscador"),
    listaBuscador: document.getElementById("lista_buscador"),
    listaBuscando: document.getElementById("lista_buscando")
};

/*ESCENA, CAMARA Y RENDER*/
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(CONFIG.colorFog, 0.02)
scene.background = new THREE.Color(0xffffff) 

const camara = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 1, 1000);
camara.position.z = CONFIG.posicionCamaraZ; 

const renderer = new THREE.WebGLRenderer({antialias: true, alpha: false});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(CONFIG.colorFog, 1);
renderer.domElement.id = 'canvas';
document.body.appendChild(renderer.domElement);

/*ILUMINACION*/
const luzAmbiente = new THREE.AmbientLight(CONFIG.colorLuz, 0.7);
scene.add(luzAmbiente);

function luzDireccional(x,y,z){
    const luz = new THREE.DirectionalLight(CONFIG.colorLuz, 0.7);
    luz.position.set(x,y,z);
    return luz;
}

scene.add(luzDireccional(10,10,10));
scene.add(luzDireccional(-10,-10,10));

/*Controles de rotacion y visualizacion*/
const control = new OrbitControls(camara, renderer.domElement);
control.autoRotate = true;
control.autoRotateSpeed = CONFIG.velocidadRotacion;
control.enableDamping = true;
control.dampingFactor = 0.1;

/*Variables Globales*/
let ciudadesData = [];
const objetosClicables = [];
const puntosCiudades = [];
const lineasMap = [];
let hitboxTierra;

const vectorRaton = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

/*Funcionalidades*/

//Pasar de latitud y longitud a una posicion de la superficie de la Tierra
function llVector(lat, lon, r) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(r * Math.sin(phi) * Math.cos(theta));
    const z = (r * Math.sin(phi) * Math.sin(theta));
    const y = (r * Math.cos(phi));
    return new THREE.Vector3(x, y, z);
}

//De imagen topografica a objeto
function informacionImagen(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    return context.getImageData(0,0,image.width, image.height);
}

//Nueva altura en funcion del relieve en el que se encuentre
function conseguirAlturaNueva(lat, lon, informacionImagen) {
    const u = (lon + 180) / 360;
    const v = (90 - lat) / 180;
    const x = Math.floor(u * (informacionImagen.width - 1));
    const y = Math.floor(v * (informacionImagen.height - 1));
    const index = (y * informacionImagen.width + x) * 4;
    return informacionImagen.data[index] / 255;
}

//Calculamos la altura de la curva de bezier 
function calcAlturaBezier(pos1, pos2){
    const medio = pos1.clone().add(pos2).multiplyScalar(0.5);
    medio.normalize(); //Hacemos que su módulo valga uno con la misma dirección 
    const alturaExtra = pos1.distanceTo(pos2) * CONFIG.bulgingScaleFactor;
    medio.multiplyScalar(CONFIG.radioTierra + alturaExtra);
    return medio;
}

/*Carga y creacion de objetos*/

//Creamos el textureLoader
const textureLoader = (url) => new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, resolve, undefined, reject);
});

//Creamos un cargador de imagenes en memoria
const loadImgHTML = (url) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = reject;
});

async function iniciarMundo() {
    try{
        const [
            texturaColor,
            texturaDesplacamiento,
            texturaNormal,
            apiData,
            imgTopografia
        ] = await Promise.all([
            textureLoader("static/img/earth_basic.jpg"),
            textureLoader("static/img/earth_topography.png"),
            textureLoader("static/img/earth_normal.jpg"),
            fetch("/api/mapa").then(res => res.json()),
            loadImgHTML("static/img/earth_topography.png")
        ]);

        ciudadesData = apiData.ciudades;
        const informacionAltura = informacionImagen(imgTopografia);

        //Creamos Tierra + Hitbox
        const tierraGeo = new THREE.SphereGeometry(CONFIG.radioTierra, 128, 128);
        const tierraMat = new THREE.MeshStandardMaterial({
            map: texturaColor,
            displacementMap: texturaDesplacamiento,
            displacementScale: CONFIG.displacementScaleFactor,
            normalMap: texturaNormal,
            normalScale: new THREE.Vector2(1, 1),
            roughnessMap: null,
            roughness: 1,
            metalness: 0
        });
        const tierraMesh = new THREE.Mesh(tierraGeo, tierraMat);
        scene.add(tierraMesh);

        const hitboxTierraGeo = new THREE.SphereGeometry(CONFIG.radioTierra, 16, 16);
        const hitboxTierraMat = new THREE.MeshBasicMaterial({visible: false});
        hitboxTierra = new THREE.Mesh(hitboxTierraGeo, hitboxTierraMat);
        scene.add(hitboxTierra);
        objetosClicables.push(hitboxTierra);

        //Creamos Ciudades + Hitbox
        //Creamos un solo material y luego lo clonamos para poderlo modificar individualmente
        const ciudadGeo = new THREE.SphereGeometry(0.05, 12, 12);
        const ciudadMat = new THREE.MeshBasicMaterial({color: 0xC73A1E});

        const ciudadAuxGeo = new THREE.SphereGeometry(0.10, 12, 12);
        const ciudadAuxMat = new THREE.MeshBasicMaterial({color: 0xEB8D7A, transparent: true, opacity: 0.3})

        const hitboxCiudadGeo = new THREE.SphereGeometry(0.20, 8, 8);
        const hitboxCiudadMat = new THREE.MeshBasicMaterial({visible: false});

        apiData.ciudades.forEach(ciudad =>{
            const ciudadActualMat = ciudadMat.clone();
            const ciudadAuxActualMat = ciudadAuxMat.clone();

            const ciudadMesh = new THREE.Mesh(ciudadGeo, ciudadActualMat);
            const ciudadAuxMesh = new THREE.Mesh(ciudadAuxGeo, ciudadAuxActualMat);
            const hitboxCiudadMesh = new THREE.Mesh(hitboxCiudadGeo, hitboxCiudadMat);

            //Actualizamos la altura nueva
            const alturaFactor = conseguirAlturaNueva(ciudad.lat, ciudad.lon, informacionAltura);
            const radioTierraNuevo = CONFIG.radioTierra + (alturaFactor * CONFIG.displacementScaleFactor);
            const ciudadPos = llVector(ciudad.lat, ciudad.lon, radioTierraNuevo);

            ciudadMesh.position.copy(ciudadPos);
            ciudadAuxMesh.position.copy(ciudadPos);
            hitboxCiudadMesh.position.copy(ciudadPos);

            hitboxCiudadMesh.userData = {
                id: ciudad.id,
                nombre: ciudad.nombre,
                datos: ciudad,
                visual: ciudadMesh,
                visualAux: ciudadAuxMesh
            };

            puntosCiudades[ciudad.id - 1] = [ciudadMesh, ciudadAuxMesh];
            objetosClicables.push(hitboxCiudadMesh);

            scene.add(ciudadMesh);
            scene.add(ciudadAuxMesh);
            scene.add(hitboxCiudadMesh);
        });

        //Creamos lineas entre ciudades
        //Hacemos lo mismo que con las ciudades, clonamos
        const lineaMat = new THREE.LineBasicMaterial({color: 0xFF21E3});
        console.log(apiData.conexiones)
        apiData.conexiones.forEach(conexion =>{
            const alturaFactor1 = conseguirAlturaNueva(conexion.lat1, conexion.lon1, informacionAltura);
            const alturaFactor2 = conseguirAlturaNueva(conexion.lat2, conexion.lon2, informacionAltura);

            const radioTierraNuevo1 = CONFIG.radioTierra + (alturaFactor1 * CONFIG.displacementScaleFactor);
            const radioTierraNuevo2 = CONFIG.radioTierra + (alturaFactor2 * CONFIG.displacementScaleFactor);
            
            const lineaPos1 = llVector(conexion.lat1, conexion.lon1, radioTierraNuevo1);
            const lineaPos2 = llVector(conexion.lat2, conexion.lon2, radioTierraNuevo2);
            const lineaPuntoMedio = calcAlturaBezier(lineaPos1, lineaPos2);

            const curva = new THREE.QuadraticBezierCurve3(lineaPos1, lineaPuntoMedio, lineaPos2);
            const curvaPuntos = curva.getPoints(50);
            
            const curvaGeo = new THREE.BufferGeometry().setFromPoints(curvaPuntos);

            const curvaMat = lineaMat.clone();

            const curvaLinea = new THREE.Line(curvaGeo, curvaMat);

            lineaMat[conexion.id - 1] = curvaLinea;
            scene.add(curvaLinea);        
        });


    } catch(error){
        console.log("Error cargando el mundo:", error);
    }
}

iniciarMundo();

/*Logica de interfaces del DOM*/

//Seleccionar linea desde la tabla (pulsar)
if(DOM.tabla){
    DOM.tabla.addEventListener("click", (event)=>{
        const fila = event.target.closest("tr");
        if(fila && lineasMap[fila.id - 1]){
            const lineaMat = lineasMap[fila.id - 1].material
            if(fila.classList.contains("seleccionada")){
                fila.classList.remove("seleccionada");
                lineaMat.color.setHex(0xFF21E3);
            }else{
                fila.classList.add("seleccionada");
                lineaMat.color.setHex(0x000000);
            }
        }
    });
}

function resetBuscador(){
    DOM.buscador.value = "";
    DOM.listaBuscando.innerHTML = "";
    DOM.listaBuscador.style.visibility = "visible";
}

function actualizarColorCiudad(id, activo){
    const ciudad = puntosCiudades[id - 1];
    if(!ciudad) return;
    if(activo){
        ciudad[0].material.color.setHex(0xF3FF0F);
        ciudad[1].material.color.setHex(0xFAFFB5);
    }else{
        ciudad[0].material.color.setHex(0xC73A1E);
        ciudad[1].material.color.setHex(0xEB8D7A);
    }
}

function addElementoBuscado(ciudad){
    if(!DOM.listaBuscador.querySelector("#" + ciudad.nombre)){
        const nuevoLi = document.createElement("li");
        const nuevoP = document.createElement("p");
        const nuevoBut = document.createElement("button");
        nuevoP.textContent = ciudad.nombre;
        nuevoBut.textContent = "x";
        nuevoLi.appendChild(nuevoP);
        nuevoLi.appendChild(nuevoBut);
        nuevoLi.classList.add("buscador_buscado-elemento");
        nuevoLi.id = ciudad.nombre;

        DOM.listaBuscador.appendChild(nuevoLi);

        actualizarColorCiudad(ciudad.id, true);

        nuevoBut.addEventListener("click", (event)=>{
            event.stopPropagation();
            delElementoBuscado(ciudad);
        });
    }
}

function delElementoBuscado(ciudad){
    const elemento = DOM.listaBuscador.querySelector("#" + ciudad.nombre);
    if(elemento) elemento.remove();
    actualizarColorCiudad(ciudad.id, false);    
}

//Pulsar lupa, iniciar busqueda
if(DOM.botonBuscador){
    DOM.botonBuscador.addEventListener("click", ()=>{
        const valorBuscador = DOM.buscador.value.toLowerCase();
        if(valorBuscador){
            ciudadesData.forEach(ciudad =>{
                if(ciudad.nombre.toLowerCase().includes(valorBuscador)) addElementoBuscado(ciudad);           });
            resetBuscador();
        } 
    });
}

//Lista buscando y pulsar en elemento lista
if(DOM.buscador){
    DOM.buscador.addEventListener("input", ()=>{
        const valorBuscador = DOM.buscador.value.toLowerCase();
        DOM.listaBuscando.innerHTML = "";

        if(valorBuscador){

            const matches = ciudadesData.filter(ciudad => ciudad.nombre.toLowerCase().includes(valorBuscador)).slice(0,5);

            matches.forEach(ciudad =>{
                const nuevoLi = document.createElement("li");
                const nuevoP = document.createElement("p");
                const nuevoFig = document.createElement("p");
                nuevoP.textContent = ciudad.nombre;
                nuevoFig.textContent = "+";
                nuevoFig.classList.add("verde");
                nuevoLi.appendChild(nuevoP);
                nuevoLi.appendChild(nuevoFig);
                nuevoLi.addEventListener("click", ()=>{
                    addElementoBuscado(ciudad);
                    resetBuscador();
                });
                DOM.listaBuscando.appendChild(nuevoLi);
            });
            DOM.listaBuscador.style.visibility = "hidden";
        }else{
            DOM.listaBuscador.style.visibility = "visible";
        }
    });
}

//Interaccion Raycaster
function interaccionRaycaster(event, isClick){
    if(event){
        vectorRaton.x = (event.clientX / window.innerWidth) * 2 - 1;
        vectorRaton.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    
    raycaster.setFromCamera(vectorRaton, camara);
    
    const intersecciones = raycaster.intersectObjects(objetosClicables); //El elemento 0 sera el mas proximo al click

    if(intersecciones.length > 0){
        const objetoCercano = intersecciones[0].object;

        if(isClick){
            if(objetoCercano !== hitboxTierra){
                const ciudad = objetoCercano.userData.datos;
                const existe = DOM.listaBuscador.querySelector("#" + ciudad.nombre);
                existe ? delElementoBuscado(ciudad) : addElementoBuscado(ciudad);
                resetBuscador();
            }
        }else{
            document.body.style.cursor = (objetoCercano === hitboxTierra) ? "default" : "pointer";
        }
    }
}

window.addEventListener("click", (event) => interaccionRaycaster(event, true));
window.addEventListener("mousemove", (event) => interaccionRaycaster(event, false));

//Actualizamos las dimensiones del canvas
window.addEventListener("resize", ()=>{
    camara.aspect = window.innerWidth / window.innerHeight;
    camara.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

/*Animacion del THREEjs*/
function animate(){
    requestAnimationFrame(animate);
    control.update();
    interaccionRaycaster(null, false);
    renderer.render(scene, camara);
}
animate()
