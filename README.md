# wllama - Wasm binding for llama.cpp

![](./README_banner.png)

Another WebAssembly binding for [llama.cpp](https://github.com/ggerganov/llama.cpp). Inspired by [tangledgroup/llama-cpp-wasm](https://github.com/tangledgroup/llama-cpp-wasm), but unlike it, **Wllama** aims to supports **low-level API** like (de)tokenization, embeddings,...

## Recent changes

- Version 1.7.0
  - When downloading, `n_downloads_parallel` is changed to `parallelDownloads`
  - Added support for `progressCallback` when downloading. See [advanced example](./examples/advanced/index.html)
- Version 1.5.0
  - Support split model using [gguf-split tool](https://github.com/ggerganov/llama.cpp/tree/master/examples/gguf-split)
- Version 1.4.0
  - Add `single-thread/wllama.js` and `multi-thread/wllama.js` to the list of `CONFIG_PATHS`
  - `createEmbedding` is now adding BOS and EOS token by default

## Features

- Typescript support
- Can run inference directly on browser (using [WebAssembly SIMD](https://emscripten.org/docs/porting/simd.html)), no backend or GPU is needed!
- No runtime dependency (see [package.json](./package.json))
- High-level API: completions, embeddings
- Low-level API: (de)tokenize, KV cache control, sampling control,...
- Ability to split the model into smaller files and load them in parallel (same as `split` and `cat`)
- Auto switch between single-thread and multi-thread build based on browser support
- Inference is done inside a worker, does not block UI render
- Pre-built npm package [@wllama/wllama](https://www.npmjs.com/package/@wllama/wllama)

Limitations:
- To enable multi-thread, you must add `Cross-Origin-Embedder-Policy` and `Cross-Origin-Opener-Policy` headers. See [this discussion](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/106#issuecomment-913450724) for more details.
- No WebGL support, but maybe possible in the future
- Max file size is 2GB, due to [size restriction of ArrayBuffer](https://stackoverflow.com/questions/17823225/do-arraybuffers-have-a-maximum-length). If your model is bigger than 2GB, please follow the **Split model** section below.

## Demo and documentations

**Documentation:** https://github.ngxson.com/wllama/docs/

Demo:
- Basic usages with completions and embeddings: https://github.ngxson.com/wllama/examples/basic/
- Advanced example using low-level API: https://github.ngxson.com/wllama/examples/advanced/
- Embedding and cosine distance: https://github.ngxson.com/wllama/examples/embeddings/

## How to use

### Use Wllama inside React Typescript project

Install it:

```bash
npm i @wllama/wllama
```

For complete code, see [examples/reactjs](./examples/reactjs)

NOTE: this example only covers completions usage. For embeddings, please see [examples/embeddings/index.html](./examples/embeddings/index.html)

### Prepare your model

- It is recommended to split the model into **chunks of maximum 512MB**. This will result in slightly faster download speed (because multiple splits can be downloaded in parallel), and also prevent some out-of-memory issues.  
  See the "Split model" section below for more details.
- It is recommended to use quantized Q4, Q5 or Q6 for balance among performance, file size and quality. Using IQ (with imatrix) is **not** recommended, may result in slow inference and low quality.

### Simple usage with ES6 module

For complete code, see [examples/basic/index.html](./examples/basic/index.html)

```javascript
import { Wllama } from './esm/index.js';

(async () => {
  const CONFIG_PATHS = {
    'single-thread/wllama.js'       : './esm/single-thread/wllama.js',
    'single-thread/wllama.wasm'     : './esm/single-thread/wllama.wasm',
    'multi-thread/wllama.js'        : './esm/multi-thread/wllama.js',
    'multi-thread/wllama.wasm'      : './esm/multi-thread/wllama.wasm',
    'multi-thread/wllama.worker.mjs': './esm/multi-thread/wllama.worker.mjs',
  };
  // Automatically switch between single-thread and multi-thread version based on browser support
  // If you want to enforce single-thread, add { "n_threads": 1 } to LoadModelConfig
  const wllama = new Wllama(CONFIG_PATHS);
  // Define a function for tracking the model download progress
  const progressCallback =  ({ loaded, total }) => {
    // Calculate the progress as a percentage
    const progressPercentage = Math.round((loaded / total) * 100);
    // Log the progress in a user-friendly format
    console.log(`Downloading... ${progressPercentage}%`);
  };
  await wllama.loadModelFromUrl(
    "https://huggingface.co/ggml-org/models/resolve/main/tinyllamas/stories260K.gguf",
    {
      progressCallback,
    }
  );
  const outputText = await wllama.createCompletion(elemInput.value, {
    nPredict: 50,
    sampling: {
      temp: 0.5,
      top_k: 40,
      top_p: 0.9,
    },
  });
  console.log(outputText);
})();
```

### Split model

Cases where we want to split the model:
- Due to [size restriction of ArrayBuffer](https://stackoverflow.com/questions/17823225/do-arraybuffers-have-a-maximum-length), the size limitation of a file is 2GB. If your model is bigger than 2GB, you can split the model into small files.
- Even with a small model, splitting into chunks allows the browser to download multiple chunks in parallel, thus making the download process a bit faster.

We use `gguf-split` to split a big gguf file into smaller files. You can download the pre-built binary via [llama.cpp release page](https://github.com/ggerganov/llama.cpp/releases):

```bash
# Split the model into chunks of 512 Megabytes
./gguf-split --split-max-size 512M ./my_model.gguf ./my_model
```

This will output files ending with `-00001-of-00003.gguf`, `-00002-of-00003.gguf`,...

You can then give a list of uploaded files to `loadModelFromUrl`:

```js
await wllama.loadModelFromUrl(
  [
    'https://huggingface.co/ngxson/tinyllama_split_test/resolve/main/stories15M-q8_0-00001-of-00003.gguf',
    'https://huggingface.co/ngxson/tinyllama_split_test/resolve/main/stories15M-q8_0-00002-of-00003.gguf',
    'https://huggingface.co/ngxson/tinyllama_split_test/resolve/main/stories15M-q8_0-00003-of-00003.gguf',
  ],
  {
    parallelDownloads: 5, // optional: maximum files to download in parallel (default: 3)
  },
);
```

## How to compile the binary yourself

This repository already come with pre-built binary from llama.cpp source code. However, in some cases you may want to compile it yourself:
- You don't trust the pre-built one.
- You want to try out latest - bleeding-edge changes from upstream llama.cpp source code.

You can use the commands below to compile it yourself:

```shell
# /!\ IMPORTANT: Require having docker compose installed

# Clone the repository with submodule
git clone --recurse-submodules https://github.com/ngxson/wllama.git
cd wllama

# Optionally, you can run this command to update llama.cpp to latest upstream version (bleeding-edge, use with your own risk!)
# git submodule update --remote --merge

# Firstly, build llama.cpp into wasm
npm run build:wasm
# Then, build ES module
npm run build
```

## TODO

Short term:
- Add a more pratical embedding example (using a better model)
- Maybe doing a full RAG-in-browser example using tinyllama?

Long term:
- Support GPU inference via WebGL
- Support multi-sequences: knowing the resource limitation when using WASM, I don't think having multi-sequences is a good idea
- Multi-modal: Waiting for refactoring LLaVA implementation from llama.cpp
