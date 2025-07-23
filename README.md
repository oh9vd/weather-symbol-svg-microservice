# Weather Symbol SVG Microservice

This project provides a lightweight Node.js microservice that dynamically generates SVG weather symbols based on Vaisala weather codes and also provides wind direction arrows with wind speed display. It's designed to be easily integrated into web applications, dashboards (like Grafana), or any system requiring dynamic weather visualizations.

## Features

* **Dynamic Vaisala Weather Symbols**: Generate complex weather symbols by combining individual SVG elements based on a 4-digit Vaisala weather code.
* **Wind Arrows with Speed**: Generate wind direction arrows that display wind speed inside a stationary circle and a rotating triangle indicating direction.
* **Modular SVG Elements**: Symbols are built from individual, easy-to-manage SVG files, allowing for high customization and future expansion.
* **SVG Optimization**: Utilizes `svgo` to optimize all generated SVGs, ensuring efficient delivery and rendering.
* **Simple API**: Provides straightforward HTTP endpoints for symbol generation.
* **Theme Support**: Wind arrow SVGs can be rendered for light or dark backgrounds.

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
    Create an `assets/elements` directory at the root of your project (sibling to `src/`) and place your individual SVG symbol files (e.g., `sun.svg`, `cloud-1.svg`, `rain.svg`, `thunderbolt.svg`, etc.) within it.

    > **Note:** The wind arrow SVG is now generated dynamically and does **not** require a `wind-arrow.svg` file in the `assets/` directory.

    Your `assets` directory structure should look like this:
    ```
    weather-symbol-svg-microservice/
    ├── src/
    │   ├── server.js
    │   ├── utils/
    │   └── services/
    ├── assets/
    │   └── elements/
    │       ├── sun.svg
    │       ├── moon.svg
    │       ├── cloud-1.svg
    │       └── ... (all your weather symbol components)
    ├── build.js
    ├── LICENSE
    ├── nodemon.json
    ├── package.json 
    └── README.md
    ```

### Running the Service

```bash
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
2. **Copies Assets**: The entire `assets/` directory (containing your SVG elements) is copied into the `dist/` folder.
3. **Creates Zip Archive**: The entire `dist/` folder (including `bundle.js` and the `assets/` directory) is compressed into a single `weather-symbol-microservice.zip` file, also located in the `dist/` directory.

### Output

After a successful build, the dist/ directory will contain:

* `bundle.js`: The minified and bundled JavaScript code for the microservice.
* `assets/`: A copy of your `assets` directory, containing all SVG elements.
* `weather-symbol-microservice.zip`: The complete distribution package ready for deployment.

### First time installation

**Note** This installation requirements are for Ubuntu 20 LTS.

First time installation steps depend on what you have already installed. This is required to be installed.
1. Create user and group for running the service as `systemd` daemon process.
    ```bash
    sudo adduser --system --no-create-home node_user
    ```
    ```bash
    sudo addgroup node_user
    ```
    ```bash
    sudo usermod -g node_user node_user
    ```
2. Create a directory to put the service and set the rights
    ```bash
    sudo mkdir -p /opt/weather_symbol_service
    ``` 
    ```bash
    sudo chown node_user:node_user /opt/weather_symbol_service
    ```
3. Do the first time deployment
    Do the first time deployment by creating the distribution package as described in the [Deployment](#deployment) section below.

4. Create `systemd` unit file
    ```bash
    sudo nano /etc/systemd/system/weather_symbol_service.service
    ```
```ini
[Unit]
Description=Weather Symbol Microservice
After=network.target # Ensures network is up before starting

[Service]
# User and Group under which the service will run
User=node_user
Group=node_user # Make sure this group exists, or remove if node_user doesn't have a dedicated group

# Define the working directory for the service
# This should be the directory where your bundle.js and assets/ are located
WorkingDirectory=/opt/weather_symbol_service
# How to start the service:
# Environment variable to define the base path for assets
# The value is the absolute path to the directory containing your 'assets' folder
# (e.g., /opt/weather_symbol_service if assets is directly under /opt/weather_symbol_service)
Environment="ASSETS_BASE_PATH=/opt/weather_symbol_service"
# The port that the service listen for incoming requests
Environment="PORT=4000"
# The command to execute when the service starts
# Replace /usr/bin/node with the actual path to your Nodejs executable
# (You can find it with 'which node' when logged in as the user)
ExecStart=/usr/bin/node /opt/weather_symbol_service/bundle.js
# Restart the service if it fails
Restart=always
RestartSec=5
# Log standard output and error to systemd journal
StandardOutput=syslog
StandardError=syslog

[Install]
WantedBy=multi-user.target # Ensures the service starts when the system boots
```

**Note** Change the PORT to your preferred unused port or keep the existing value.

5. Reload systemd daemon

    ```bash
    sudo systemctl daemon-reload
    ```

6. Start the service

    ```bash
    sudo systemctl start weather_symbol_service
    ```
7. Check the service starts normally

    ```bash
    sudo systemctl status weather_symbol_service
    ```
    It should return something like:

    ```
    weather_symbol_service.service - Weather Symbol service
     Loaded: loaded (/etc/systemd/system/weather_symbol_service.service; disabled; vendor preset: enabled)
     Active: active (running) since Tue 2025-06-03 17:37:50 EEST; 15s ago
   Main PID: 634355 (node)
      Tasks: 7 (limit: 4181)
     Memory: 35.4M
     CGroup: /system.slice/weather_symbol_service.service
             └─634355 /usr/bin/node /opt/weather_symbol_service/bundle.js
     ... systemd[1]: Started Weather Symbol service.
     ... node[634355]: SVG server running at http://localhost:4000

    ```
8. Enable the service to run after booting the host
    ```bash
    sudo systemctl enable weather_symbol_service
    ```
9. Check the health endpoint:
    ```bash
    curl localhost:4000
    ```

    It should return something like:
    ```
    2025-06-03T14:52:43.948Z: SVG Server is running!
    ```
10. Check the system log for errors
    ```bash
    sudo journalctl -u weather_symbol_service.service -f
    ```

    **Note**: The `journalctl -f` command will show you the real-time logs of your service, which is very useful for debugging startup issues.

Now you can access the weather and wind arrow symbols as described in the endpoint descriptions below.

### Deployment

#### Docker Deployment

The service can be easily containerized using the included Dockerfile for consistent deployment across environments:

1. **Build the Docker image:**

   ```bash
   docker build -t weather-symbol-svg-microservice .
   ```

2. **Run the container:**

   ```bash
   docker run -p 4000:4000 weather-symbol-svg-microservice
   ```
   
   Or with a custom port:

   ```bash
   docker run -p 8080:4000 -e PORT=4000 weather-symbol-svg-microservice
   ```

3. **Run in detached mode:**

   ```bash
   docker run -d -p 4000:4000 --name weather-symbols weather-symbol-svg-microservice
   ```

The Dockerfile uses Node.js 22 LTS with Alpine Linux for a secure, lightweight container that includes all necessary dependencies and automatically runs the build process.

#### Manual Deployment

To deploy the service manually:

1. Transfer the `weather-symbol-microservice.zip` file to your target server.
2. Unzip the package.
3. Navigate into the unzipped directory (e.g., `dist/` or `weather-symbol-microservice/`).
4. Install production dependencies:
    ```bash
    npm install --production
    ```
    This will install `express`, `svgo`, and `cors`, which are external dependencies not bundled into `bundle.js`.

5. Start the service:

    ```bash
    node bundle.js
    ```

    **Note**: The listening port can be set using the environment variable PORT. If not set, the service will listen on port 4000.

    For example:
    ```bash
    PORT=8080 node bundle.js
    ```

    In a production environment, you can set it, for example, in a `systemd` unit file, a Docker container, or in a Kubernetes configuration.

6. Copy the deployment archive `weather-symbol-microservice.zip` to the target by your preferred method. (for example using `scp`).

   **Note** `node_user` does not have home directory. If using `scp`, you need to copy the distribution package first to a user account you have write access to, and then move the zip file to the`/opt/weather_symbol_service` directory.

7. On the target host, move the zip to installation directory `/opt/weather_symbol_server`, unzip it, and install the dependencies.
    
    Run the following commands
    ```bash
    sudo mv weather-symbol-microservice.zip /opt/weather_symbol_service/.
    ```
    ```bash        
    cd /opt/weather_symbol_service
    ```
    ```bash     
    sudo unzip weather-symbol-microservice.zip
    ```
    ```bash     
    sudo chown -R node_user:node_user /opt/weather_symbol_service/
    ```
    ```bash     
    sudo -u node_user npm install --production
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

### 2. Wind Arrows with Speed

Generate a wind arrow SVG with wind speed inside a stationary circle and a rotating triangle for direction.

* **URL:** `/wind_direction/:angle`
* **Method:** `GET`
* **URL Parameters:**
    * `angle`: The rotation angle in degrees (0-359).
    * `speed`: the wind speed in m/s
* **Query Parameters:**
    * `width`: Desired width of the SVG (default: `64`).
    * `height`: Desired height of the SVG (default: `64`).
    * `viewBox`: Desired `viewBox` attribute for the SVG (default: `0 0 64 64`).
    * `theme`: (Optional) `light`, `dark`, or `auto` (default: `auto`). Adjusts SVG colors for background.
* **Example Request:**
    ```
    http://localhost:4000/wind_direction/90,5?speed=12&width=100&height=100&theme=dark
    ```
* **Success Response:** Returns an `image/svg+xml` with the wind arrow and speed.
* **Error Response:**
    * `400 Bad Request`: If `angle` or `speed` is invalid.
    * `500 Internal Server Error`: If there's a server-side issue generating the SVG.

### 3. Health Check

A simple endpoint to check if the service is running.

* **URL:** `/`
* **Method:** `GET`
* **Example Request:**
    ```
    http://localhost:4000/
    ```
* **Success Response:** Returns something like `2025-06-01T11:32:43.513Z: SVG Server is running!`, where the date and time is retrieved from current time in server.

## Running Tests

To run the test suite:

```bash
npm test
```

This will run all Mocha/Chai tests in the `test/` directory.

## Project Structure
```
your-project/
├── src/
│   ├── server.js               # Main Express application, handles routing and server startup.
│   ├── utils/                  # Utility functions.
│   │   ├── svgExtractor.js     # Extracts <style>, <defs>, and main content from SVG strings.
│   │   ├── validator.js        # Contains validation logic for weather codes and angles.
│   │   └── windArrow.js        # Generates wind arrow SVGs with speed and direction.
│   └── services/               # Core application logic.
│       └── weatherSymbolService.js # Parses Vaisala codes, combines SVG components, and handles wind arrow generation.
├── assets/                 # Directory for all SVG assets.
│   └── elements/           # Individual SVG components for weather symbols (e.g., cloud-1.svg, sun.svg).
├── build.js                # Module for distribution package building.
├── LICENSE                 # MIT license. 
├── nodemon.json            # Nodemon settings for debugging.
├── package.json            # Project dependencies and scripts.
└── README.md               # This file.
```

## How It Works

* **`server.js`**: Sets up the Express server, defines API routes, and acts as the entry point. It delegates complex logic to the `services` layer.
* **`utils/svgExtractor.js`**: This utility is crucial for dissecting raw SVG files, allowing their `<defs>` and `<style>` blocks to be merged intelligently and their main content transformed.
* **`utils/validator.js`**: Ensures that incoming `weather_code` and `angle` parameters are in the expected format, preventing malformed requests.
* **`utils/windArrow.js`**: Dynamically generates wind arrow SVGs with a stationary circle (showing wind speed) and a rotating triangle (showing wind direction), with theme-aware styling.
* **`services/weatherSymbolService.js`**:
    * **Vaisala Weather Codes**: The `parseVaisalaWeatherCode` function interprets the 4-digit Vaisala code into a list of required SVG component names (e.g., `sun`, `cloud-3`, `snow`). It includes logic to handle day/night, cloudiness, precipitation type, and rate.
    * **SVG Combination**: For Vaisala symbols, it reads multiple individual SVG element files (from `assets/elements/`), extracts their content, styles, and definitions, then dynamically compiles a single output SVG with appropriate `translate` and `scale` transformations for each component.
    * **Wind Arrow**: Wind arrow SVGs are generated dynamically using `utils/windArrow.js` and do not require a static SVG asset.
    * **Optimization**: All final SVGs are passed through `svgo` for optimization before being sent as a response.

## Customization

* **SVG Elements:** Modify or create new SVG files in the `assets/elements/` directory to change the appearance of symbols or add new ones. Ensure naming conventions align with the `weatherSymbolService.js` logic (e.g., `cloud-1.svg`, `snow.svg`).
* **Vaisala Logic:** Adjust the `addCelestialBody`, `addCloudiness`, and `addPrecipitation` functions within `services/weatherSymbolService.js` to modify how different Vaisala codes are interpreted and how symbols are combined.
* **Styling & Animation:** Individual SVG elements can contain their own CSS (`<style>`) and SVG animations (`<animate>`, `<animateTransform>`), which will be preserved when combined.

## SVG Elements
|code | Path | Image | Note
|---|---|---|---
|`d...`|./assets/elements/sun.svg|![sun.svg](./assets/elements/sun.svg)
|`n...`|./assets/elements/moon.svg|![moon.svg](./assets/elements/moon.svg)
|`.1..`<br/>`.2..`|./assets/elements/cloud-1.svg|![cloud-1](./assets/elements/cloud-1.svg)| In case of `..1.` the cloud is translated higher and scaled smaller
|`.3..`<br/>`.4..`|./assets/elements/cloud-3.svg|![cloud-3](./assets/elements/cloud-3.svg)| In case of `.4..` sun/moon is not rendered
|`.5..`|./assets/elements/cloud-5.svg|![cloud-5](./assets/elements/cloud-5.svg)
|`.6..`|./assets/elements/cloud-6.svg|![cloud-6](./assets/elements/cloud-6.svg)
|`..10`<br/>`..20`<br/>`..30`<br/>`..11`<br/>`..21`<br/>`..31`|./assets/elements/rain.svg|![rain](./assets/elements/rain.svg)| - The drop is multiplied by the precipitation level. <br/>- If sleet (`...1`) the drops are rendered with snow.
|`..12`<br/>`..22`<br/>`..32`<br/>`..11`<br/>`..21`<br/>`..31`|./assets/elements/snow.svg|![rain](./assets/elements/snow.svg)| - The snow flake is multiplied by the precipitation level. <br/>- If sleet (`...1`) the snow flakes are rendered with rain drop.
|`..40`|./assets/elements/thunderbolt.svg|![thunderbolt](./assets/elements/thunderbolt.svg)| The precipitation level is adjusted to 2 

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

This project benefits greatly from the work and resources provided by the following:

* **Vaisala Weather Symbols:** The core weather symbol logic is inspired by and based on the [official Vaisala Weather Symbols](https://www.vaisala.com/en/vaisala-weather-symbols) definitions, which serve as the foundation for interpreting weather codes.
* **Weather Icons by Makin-Things:** The initial SVG assets and design inspiration for many of the weather elements are derived from the excellent [weather-icons repository by Makin-Things](https://github.com/Makin-Things/weather-icons.git).
* **Google Gemini:** Development and code refactoring assistance were provided by Google Gemini, an AI assistant.