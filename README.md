<div align="center">

# 🎲 Dices

**Un adictivo juego incremental e idle de dados poliédricos 3D, combos de póker y física de casino.**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

[**🎮 Jugar en Vivo**](https://dices-opal.vercel.app/) · [Reportar Bug](https://github.com/kikooooo22/Dices/issues) · [Solicitar Característica](https://github.com/kikooooo22/Dices/issues)

</div>

---

## 🌟 Características Principales

- **🎲 Geometría Poliédrica 3D en Tiempo Real**:
  - Dados vectoriales poliédricos de 6, 8, 10, 12 y 20 caras (D6, D8, D10, D12, D20) con iluminación dinámica y sombreadores de material (Madera, Plástico Rubí, Metal Cromo, Cristal Traslúcido, Neón Cyberpunk y Cósmico).
- **🃏 Sistema Completo de Manos de Póker y Combos**:
  - Reconocimiento automático de Parejas, Tríos, Dobles Parejas, Full House, Póker (4 iguales), Quintetos, Sextetos, Septetos, Octetos, Nonetos y el legendario **¡Deceto Divino (10 iguales)!** ($\times 500$).
  - Resaltado cromático temático de bordes: cada pareja y mano de dados se ilumina en su respectiva familia de color con variaciones tonales diferenciadas.
- **⚡ Automatización y Ráfagas Turbo (Hasta 60+ tiros/seg)**:
  - **Mano Mecánica (Auto-Roller)**: Tiradas pasivas constantes con botón flotante interactivo de pausa/reanudación.
  - **Dedos Rápidos (Lvl 1 - 40)**: Acelera la recarga manual hasta velocidades absurdas para el endgame.
  - **Lanzamiento Continuo (Hold to Roll)**: Mantén presionada la mesa o el botón para disparar ráfagas continuas de dados sin interrupciones por deslizamiento.
  - **Modo Estático Turbo**: Optimización de alto rendimiento que elimina el lag a máxima velocidad en cualquier dispositivo móvil.
- **👻 Dados Fantasma & Modificadores de Probabilidad**:
  - Invoca dados etéreos que flotan en su propio pedestal inferior aportando puntos extra.
  - Caras trucadas, magnetismo de mesa y eliminación de peores casos (transforma unos en valores máximos).
- **🎵 Motor de Audio Sintetizado (Web Audio API)**:
  - Efectos de sonido dinámicos según el material del dado (madera, metal, cristal, neón).
  - Escalas musicales pentatónicas en las pestañas de la tienda y fanfarrias de combo.
- **🎛️ Menú de Rendimiento y Opciones**:
  - Control de volumen maestro y estadísticas de carrera completas.
  - Opciones de personalización visual (activar/desactivar textos flotantes, dados giratorios y confeti).
  - Menú secreto de trucos con **Modo Fiesta (8s de música y baile)**.

---

## 🎮 Controles y Modo de Juego

| Acción | Control | Descripción |
| :--- | :--- | :--- |
| **Tirar Dados** | Clic / Tap en Mesa o Botón | Lanza los dados manualmente para ganar puntos. |
| **Lanzamiento Continuo** | Mantener Presionado | Ráfaga continua de tiros (requiere desbloquear mejora). |
| **Pausar / Reanudar Auto-Roller** | Clic en Icono `[X.X/s]` | Pausa o activa las tiradas automáticas pasivas. |
| **Tienda de Mejoras** | Botón `Tienda 🛒` | Compra más dados, nuevos lados, materiales y automatizaciones. |
| **Ajustes y Gráficos** | Botón `Opciones ⚙️` | Pausa el juego y ajusta audio, gráficos y estadísticas. |

---

## 🛠️ Tecnologías Utilizadas

- **Framework**: React 19 + TypeScript + Vite
- **Estilos**: TailwindCSS v4 + CSS personalizado de casino/glassmorphism
- **Animaciones**: Motion (Framer Motion) + Canvas Confetti
- **Iconografía**: Lucide React
- **Audio**: Web Audio API (Síntesis de frecuencia pura sin assets pesados)

---

## 🚀 Instalación y Ejecución Local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/kikooooo22/Dices.git
   cd Dices
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

4. **Compilar para producción:**
   ```bash
   npm run build
   ```

---

## 📄 Licencia

Este proyecto está bajo la Licencia **GNU General Public License v3.0 (GPLv3)**. Consulta el archivo [LICENSE](LICENSE) para más detalles.

---

<div align="center">
  <sub>Desarrollado con ❤️ por <a href="https://github.com/kikooooo22">kikooooo22</a></sub>
</div>
