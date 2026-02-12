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

This section is inspired from websites like this:

- [Discover Automata](https://discover-automata.vercel.app)
- [1D Cellular Automata and the Edge Of Chaos](https://math.hws.edu/eck/js/edge-of-chaos/CA.html)

### 2D discrete cellular Automata

This page lets you implement things like this:

- [The cyclic cellular automaton](https://english.rejbrand.se/rejbrand/article.asp?ItemIndex=430)
- [More cyclic cellular automata](https://english.rejbrand.se/rejbrand/article.asp?ItemIndex=431)
- [A rose-producing cyclic cellular automaton](https://english.rejbrand.se/rejbrand/article.asp?ItemIndex=432)
- [Miscellaneous cellular automata](https://english.rejbrand.se/rejbrand/mathart_other_ca.asp) (scroll to the bottom of that page to read more about the examples)

### 2D neural cellular Automata

Watch this video: [What are neural cellular automata?](https://www.youtube.com/watch?v=3H79ZcBuw4M)

The web application mentioned in that video (epilepsy warning!):

https://neuralpatterns.io

### Procedural noise

This section uses various algorithms to generate random patterns:

- [Value noise](https://www.scratchapixel.com/lessons/procedural-generation-virtual-worlds/procedural-patterns-noise-part-1/introduction.html)
- [Perlin noise](https://www.scratchapixel.com/lessons/procedural-generation-virtual-worlds/perlin-noise-part-2/perlin-noise.html)
- [Simplex noise](https://cgvr.cs.uni-bremen.de/teaching/cg_literatur/simplexnoise.pdf)
- [Cubic noise](https://jobtalle.com/cubic_noise.html)
- [Worley noise](https://en.wikipedia.org/wiki/Worley_noise)

The result of these basic noises can be tweaked in a few different ways:

- [Multiple octaves](https://iquilezles.org/articles/fbm/)
- [Domain warping](https://iquilezles.org/articles/warp/)
- [Domain rotation](https://noiseposti.ng/posts/2022-01-16-The-Perlin-Problem-Moving-Past-Square-Noise.html)

## Planned features

### Wave function collapse

I already have an implementation, but it's currently unused.

### Erosion

Generate natural looking terrain that has been shaped by water erosion.

#### Global erosion simulator

These types of algorithms simulate water eroding soil material, carrying the sediment down the slopes and depositing the sediment in areas of lower elevation. They do it over multiple time steps, not in one go. Since sediment from any part of the terrain can be move to any other part, these algorithms are better suited for fixed size worlds.

- This [paper](https://inria.hal.science/inria-00402079/document) describes a GPU-compatible algorithm for hydraulic erosion.
- This [paper](https://old.cescg.org/CESCG-2011/papers/TUBudapest-Jako-Balazs.pdf) decribes an improvement to previous paper by integrating thermal erosion.
- This [post](https://math.stackexchange.com/questions/1044044/local-tilt-angle-based-on-height-field) explains what "local tilt angle" means, useful for understanding both papers.

#### Local erosion simulator

Implement an algorithm that simulates erosion in a locally computed manner, so that it's suitable for infinite procedurally generated worlds.

- Dendry: [code](https://github.com/mgaillard/Noise) and [paper](https://dl.acm.org/doi/epdf/10.1145/3306131.3317020).
- Analytical terrain: [code](https://gitlab.inria.fr/landscapes/analytical-terrains/-/tree/main/analytical?ref_type=heads) and [paper](https://hal.science/hal-04525371v1/document)

### Cave generation

Procedural generation of 3D cave systems. Maybe also implement a voxel engine to render the caves.

#### Voxel-based methods
- [A Voxel-based Octree Construction Approach for Procedural Cave Generation](https://www.researchgate.net/publication/266043303_A_Voxel-based_Octree_Construction_Approach_for_Procedural_Cave_Generation)
- [Cellular automata for real-time generation of infinite cave levels](https://dl.acm.org/doi/10.1145/1814256.1814266)
- [Cellular Automata Method for Generating Random Cave-Like Levels](https://www.roguebasin.com/index.php?title=Cellular_Automata_Method_for_Generating_Random_Cave-Like_Levels)

#### Other methods
- [Procedural Generation of 3D Caves for Games on the GPU](https://www.researchgate.net/publication/277707378_Procedural_Generation_of_3D_Caves_for_Games_on_the_GPU)
- [Procedural generation of 3D karst caves with speleothems](https://www.sciencedirect.com/science/article/pii/S0097849321002132?utm_source=chatgpt.com)
