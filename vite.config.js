import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

function camelize(str) {
  let arr = str.split('-');
  let capital = arr.map((item) => item.charAt(0).toUpperCase() + item.slice(1).toLowerCase());
  return capital.join('');
}

function removeScope(str) {
  let arr = str.split('/');
  if (arr.length > 1) {
    return arr[1];
  }
  return str;
}

//console.log('process', process.env)

let packageName = removeScope(process.env.npm_package_name);

let packageExportName = camelize(packageName);

// https://vite.dev/config/
export default function (build) {
  if (build.mode == 'development') {
    return defineConfig({
      define: {
        DEVELOPMENT: true,
        package: JSON.stringify({
          name: packageName,
          version: process.env.npm_package_version,
          description: process.env.npm_package_description,
        }),
      },
      plugins: [vue()],
    });
  }

  return defineConfig({
    //base: "/admin/",
    define: {
      //apiHOST: "" + process.env.ROUTER_PROXY_URL,
      package: JSON.stringify({
        name: packageName,
        version: process.env.npm_package_version,
        description: process.env.npm_package_description,
      }),
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    plugins: [vue(), viteSingleFile()],
    build: {
      outDir: 'dist',
      /*lib: {
        entry: 'src/main.js',
        name: packageExportName,
        // the proper extensions will be added
        fileName: packageName,
        formats: ['umd'],
      },*/
      rollupOptions: {
        // make sure to externalize deps that shouldn't be bundled
        // into your library
        external: [
          //"vue",
        ],
        output: {
          inlineDynamicImports: true,
          // Provide global variables to use in the UMD build
          // for externalized deps
          globals: {
            //vue: "Vue",
          },
        },
      },
    },
  });
}
