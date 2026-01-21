# Algorithms

This is a web application that implements various algorithms that generate interesting visual patterns. The application lets you configure and tweak the parameters of those algorithms, but there isn't much documentation right now.

## Setup

1. Install [node.js](https://nodejs.org/en).
2. Clone this repo.
3. Navigate to the project directory in the terminal (command line).
4. Run `npm install`. This might take a few minutes and it downloads all of the dependencies into `node_modules` folder.

## Run

1. Navigate to the project directory in the terminal.
2. Run `npm run dev`.
3. Open `http://localhost:5173/` in your browser

## Description

This application doesn't document itself, but here I will refer to online resources where you can read about the algorithms.

### 1D Cellular automata

This section is inspired from this website:

https://discover-automata.vercel.app

### Neural Cellular Automata

Watch this video:

https://www.youtube.com/watch?v=3H79ZcBuw4M

### Procedural noise

This section uses various algorithms to generate random patterns:

* [Value noise](https://www.scratchapixel.com/lessons/procedural-generation-virtual-worlds/procedural-patterns-noise-part-1/introduction.html)
* [Perlin noise](https://www.scratchapixel.com/lessons/procedural-generation-virtual-worlds/perlin-noise-part-2/perlin-noise.html)
* [Simplex noise](https://cgvr.cs.uni-bremen.de/teaching/cg_literatur/simplexnoise.pdf)
* [Cubic noise](https://jobtalle.com/cubic_noise.html)
* [Worley noise](https://en.wikipedia.org/wiki/Worley_noise)

The result of these basic noises can be tweaked in a few different ways:
* [Multiple octaves](https://iquilezles.org/articles/fbm/)
* [Domain warping](https://iquilezles.org/articles/warp/)
* [Domain rotation](https://noiseposti.ng/posts/2022-01-16-The-Perlin-Problem-Moving-Past-Square-Noise.html)
