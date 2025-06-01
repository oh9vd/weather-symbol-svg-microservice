# Weather Symbol SVG Microservice


This project provides a lightweight Node.js microservice that dynamically generates SVG weather symbols based on Vaisala weather codes and also provides rotatable wind direction arrows. It's designed to be easily integrated into web applications, dashboards (like Grafana), or any system requiring dynamic weather visualizations.

## Features

* **Dynamic Vaisala Weather Symbols**: Generate complex weather symbols by combining individual SVG elements based on a 4-digit Vaisala weather code.
* **Rotatable Wind Arrows**: Request wind direction arrows rotated to any specified degree.
* **Modular SVG Elements**: Symbols are built from individual, easy-to-manage SVG files, allowing for high customization and future expansion.
* **SVG Optimization**: Utilizes `svgo` to optimize all generated SVGs, ensuring efficient delivery and rendering.
* **Simple API**: Provides straightforward HTTP endpoints for symbol generation.

## Getting Started

### Prerequisites

* Node.js (LTS version recommended)
* npm or Yarn

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/oh9vd/weather-symbol-svg-microservice
    cd weather-symbol-svg-microservice
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or yarn install
    ```
3.  **Place SVG assets:**
    Create an `assets/elements` directory at the root of your project (sibling to `src/`) and place your individual SVG symbol files (e.g., `sun.svg`, `cloud-1.svg`, `precip-10.svg`, `thunderbolt.svg`, etc.) within it. Also, place `wind-arrow.svg` directly in the `assets/` directory.

    Your `assets` directory structure should look like this:
    ```
    weather-symbol-svg-microservice/
    ├── src/
    │   ├── server.js
    │   ├── utils/
    │   └── services/
    ├── assets/
    │   ├── elements/
    │   │   ├── sun.svg
    │   │   ├── moon.svg
    │   │   ├── cloud-1.svg
    │   │   └── ... (all your weather symbol components)
    │   └── wind-arrow.svg
    ├── build.js
    ├── LICENSE
    ├── nodemon.json
    ├── package.json 
    └── README.md
    ```

### Running the Service

``` bash
node src/server.js
```

The service will start on `http://localhost:4000`.

## Build Process

To create a single, deployable version of the microservice, a build process is integrated using `esbuild` for JavaScript bundling and `fs-extra` and `archiver` for asset copying and zipping.

### Running the Build

```bash
npm run build
```
This command performs the following steps:

1. **Bundles JavaScript**: All source JavaScript files (`src/`) are combined and minified into a single `bundle.js` file, optimized for Node.js.
2. **Copies Assets**: The entire `assets/` directory (containing your SVG elements and `wind-arrow.svg`) is copied into the `dist/` folder.
3. **Creates Zip Archive**: The entire `dist/` folder (including `bundle.js` and the `assets/` directory) is compressed into a single `weather-symbol-microservice.zip` file, also located in the `dist/` directory.

### Output

After a successful build, the dist/ directory will contain:

* `bundle.js`: The minified and bundled JavaScript code for the microservice.
* `assets/`: A copy of your `assets` directory, containing all SVG elements.
* `weather-symbol-microservice.zip`: The complete distribution package ready for deployment.

### Deployment

To deploy the service:

1. Transfer the `weather-symbol-microservice.zip` file to your target server.
2. Unzip the package.
3. Navigate into the unzipped directory (e.g., `dist/` or `eather-symbol-microservice/`).
4. Install production dependencies:
    ```bash
    npm install --production
    ```
    This will install `express`, `svgo`, and `cors`, which are external dependencies not bundled into `bundle.js`.

5. Start the service:

    ```bash
    node bundle.js
    ```

## API Endpoints

### 1. Vaisala Weather Symbols

Generate a weather symbol based on a Vaisala weather code.

* **URL:** `/weather_symbol/:weather_code`
* **Method:** `GET`
* **URL Parameters:**
    * `weather_code`: A 4-character string representing the Vaisala weather code (e.g., `d220` for light rain showers during day with broken clouds).
* **Query Parameters (Optional):**
    * `width`: Desired width of the SVG (default: `64`).
    * `height`: Desired height of the SVG (default: `64`).
    * `viewBox`: Desired `viewBox` attribute for the SVG (default: `0 0 64 64`).
* **Example Request:**
    ```
    http://localhost:4000/weather_symbol/d220?width=100&height=100
    ```
* **Success Response:** Returns an `image/svg+xml` with the generated weather symbol.
* **Error Response:**
    * `400 Bad Request`: If `weather_code` is invalid or unprocessable.
    * `500 Internal Server Error`: If there's a server-side issue generating the SVG.

### 2. Wind Direction Arrows

Generate a wind arrow rotated to a specific angle.

* **URL:** `/wind_arrow/:angle`
* **Method:** `GET`
* **URL Parameters:**
    * `angle`: The rotation angle in degrees (0-359).
* **Example Request:**
    ```
    http://localhost:4000/wind_arrow/90
    ```
* **Success Response:** Returns an `image/svg+xml` with the rotated wind arrow.
* **Error Response:**
    * `400 Bad Request`: If `angle` is invalid.
    * `500 Internal Server Error`: If there's a server-side issue generating the SVG.

### 3. Health Check

A simple endpoint to check if the service is running.

* **URL:** `/`
* **Method:** `GET`
* **Example Request:**
    ```
    http://localhost:4000/
    ```
* **Success Response:** Returns something like `2025-06-01T11:32:43.513Z: SVG Server is running!`, where the date and time is received from current time in server.

## Project Structure
```
your-project/
├── src/
│   ├── server.js               # Main Express application, handles routing and server startup.
│   ├── utils/                  # Utility functions.
│   │   ├── svgExtractor.js     # Extracts &lt;style>, &lt;defs>, and main content from SVG strings.
│   │   └── validator.js        # Contains validation logic for weather codes and angles.
│   └── services/               # Core application logic.
│       └── weatherSymbolService.js # Parses Vaisala codes, combines SVG components, and handles wind arrow generation.
├── assets/                 # Directory for all SVG assets.
│   ├── elements/           # Individual SVG components for weather symbols (e.g., cloud-1.svg, sun.svg).
│   └── wind-arrow.svg      # The base SVG for the wind arrow.           
├── build.js                # Module for distribution package building
├── LICENSE                 # MIT license 
├── nodemon.json            # node mon settings for debugging
├── package.json            # Project dependencies and scripts.
└── README.md               # This file.
```

## How It Works

* **`server.js`**: Sets up the Express server, defines API routes, and acts as the entry point. It delegates complex logic to the `services` layer.
* **`utils/svgExtractor.js`**: This utility is crucial for dissecting raw SVG files, allowing their `<defs>` and `<style>` blocks to be merged intelligently and their main content transformed.
* **`utils/validator.js`**: Ensures that incoming `weather_code` and `angle` parameters are in the expected format, preventing malformed requests.
* **`services/weatherSymbolService.js`**:
    * **Vaisala Weather Codes**: The `parseVaisalaWeatherCode` function interprets the 4-digit Vaisala code into a list of required SVG component names (e.g., `sun`, `cloud-2`, `precip-10`). It includes logic to handle day/night, cloudiness, precipitation type, and rate.
    * **SVG Combination**: For Vaisala symbols, it reads multiple individual SVG element files (from `assets/elements/`), extracts their content, styles, and definitions, then dynamically compiles a single output SVG with appropriate `translate` and `scale` transformations for each component.
    * **Wind Arrow**: For wind arrows, it reads the base `wind-arrow.svg` and applies a `rotate` transformation around its center to achieve the desired direction.
    * **Optimization**: All final SVGs are passed through `svgo` for optimization before being sent as a response.

## Customization

* **SVG Elements:** Modify or create new SVG files in the `assets/elements/` directory to change the appearance of symbols or add new ones. Ensure naming conventions align with the `weatherSymbolService.js` logic (e.g., `cloud-1.svg`, `precip-20.svg`).
* **Vaisala Logic:** Adjust the `addCelestialBody`, `addCloudiness`, and `addPrecipitation` functions within `services/weatherSymbolService.js` to modify how different Vaisala codes are interpreted and how symbols are combined.
* **Styling & Animation:** Individual SVG elements can contain their own CSS (`<style>`) and SVG animations (`<animate>`, `<animateTransform>`), which will be preserved when combined.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

This project benefits greatly from the work and resources provided by the following:

* **Vaisala Weather Symbols:** The core weather symbol logic is inspired by and based on the [official Vaisala Weather Symbols](https://www.vaisala.com/en/vaisala-weather-symbols) definitions, which serve as the foundation for interpreting weather codes.
* **Weather Icons by Makin-Things:** The initial SVG assets and design inspiration for many of the weather elements are derived from the excellent [weather-icons repository by Makin-Things](https://github.com/Makin-Things/weather-icons.git).
* **Google Gemini:** Development and code refactoring assistance were provided by Google Gemini, an AI assistant.