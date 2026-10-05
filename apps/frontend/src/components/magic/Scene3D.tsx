"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Escena 3D de fondo con Three.js "vanilla" (sin react-three-fiber: r3f 9 exige React 19 y el
 * proyecto usa React 18, lo que tumbaba toda la app). Todo es procedural, sin texturas ni HDRI:
 *  · campo de partículas cálidas con parallax al puntero
 *  · nudo toroidal metálico, icosaedro de alambre y octaedro de cristal, con flotación suave
 * Ciclo de vida propio: pausa con la pestaña oculta, se adapta al tamaño y libera la GPU al salir.
 */
export default function Scene3D({ hero = false }: { hero?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef(hero);
  heroRef.current = hero;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, { position: "absolute", inset: "0", width: "100%", height: "100%" });

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
    camera.position.set(0, 0, 8);

    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const warm = new THREE.PointLight(0xff8a3d, 90, 0, 2); warm.position.set(6, 5, 4); scene.add(warm);
    const deep = new THREE.PointLight(0xe8581a, 40, 0, 2); deep.position.set(-6, -4, 3); scene.add(deep);

    // — Partículas
    const COUNT = 520;
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const orange = new THREE.Color("#e8581a");
    const amber = new THREE.Color("#ff9a4d");
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 26;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 14 - 2;
      const c = Math.random() > 0.72 ? orange : amber.clone().multiplyScalar(0.35 + Math.random() * 0.4);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const pMat = new THREE.PointsMaterial({ size: 0.045, vertexColors: true, transparent: true, opacity: 0.75, depthWrite: false, sizeAttenuation: true });
    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    // — Formas
    const knotMat = new THREE.MeshPhysicalMaterial({ color: 0xe8581a, metalness: 0.85, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.15, emissive: 0x5a1c05, emissiveIntensity: 0.55 });
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1, 0.32, 160, 20), knotMat);
    const icoMat = new THREE.MeshBasicMaterial({ color: 0xf08a5a, wireframe: true, transparent: true, opacity: 0.4 });
    const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), icoMat);
    const octMat = new THREE.MeshPhysicalMaterial({ color: 0xffb37a, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.55, clearcoat: 1, emissive: 0xe8581a, emissiveIntensity: 0.25 });
    const oct = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), octMat);
    scene.add(knot, ico, oct);

    const place = () => {
      const h = heroRef.current;
      const s = h ? 1.25 : 1;
      knot.scale.setScalar(0.95 * s); ico.scale.setScalar(1.5 * s); oct.scale.setScalar(0.7 * s);
      return {
        knot: new THREE.Vector3(h ? 3.9 : 5.4, h ? 0.6 : 1.6, -2),
        ico: new THREE.Vector3(h ? -4.2 : -6, h ? -0.9 : -1.9, -3),
        oct: new THREE.Vector3(h ? -2.2 : 2.2, h ? 2.3 : -2.6, -1),
      };
    };
    let base = place();

    const resize = () => {
      const w = host.clientWidth || window.innerWidth;
      const h = host.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const mouse = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let raf = 0;
    let last = performance.now();
    let disposed = false;
    const loop = (now: number) => {
      if (disposed) return;
      raf = requestAnimationFrame(loop);
      if (document.hidden) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      points.rotation.y += dt * 0.012;
      points.rotation.x += (mouse.y * 0.06 - points.rotation.x) * 0.03;
      points.position.x += (mouse.x * 0.5 - points.position.x) * 0.03;

      knot.rotation.x += dt * 0.18; knot.rotation.y += dt * 0.24;
      ico.rotation.x -= dt * 0.1; ico.rotation.z += dt * 0.14;
      oct.rotation.y += dt * 0.2; oct.rotation.z -= dt * 0.12;

      knot.position.set(base.knot.x, base.knot.y + Math.sin(t * 1.2) * 0.28, base.knot.z);
      ico.position.set(base.ico.x, base.ico.y + Math.sin(t * 1.5 + 1) * 0.22, base.ico.z);
      oct.position.set(base.oct.x, base.oct.y + Math.sin(t * 1.1 + 2) * 0.32, base.oct.z);

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    // Reposiciona cuando cambia el modo hero (login ↔ app) sin recrear el renderer.
    let lastHero = heroRef.current;
    const heroWatch = window.setInterval(() => {
      if (heroRef.current !== lastHero) { lastHero = heroRef.current; base = place(); }
    }, 400);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearInterval(heroWatch);
      window.removeEventListener("pointermove", onMove);
      ro.disconnect();
      pGeo.dispose(); pMat.dispose();
      knot.geometry.dispose(); knotMat.dispose();
      ico.geometry.dispose(); icoMat.dispose();
      oct.geometry.dispose(); octMat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0" />;
}
