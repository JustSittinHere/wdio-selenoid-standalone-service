# WebdriverIO Selenoid Standalone Service

Using Selenium Standalone, ChromeDriver etc are great ways to run automated tests on your machine or CI, but they use the locally installed browser to execute the tests.  What happens if you don't have that browser on your machine?  Or if you want to test a different version of the browser than you have installed?  Selenoid to the rescue!

From [Aerokube Selenoid](https://aerokube.com/selenoid/) Selenoid is "A lightning fast Selenium protocol implementation running browsers in Docker containers"

As long as you have docker installed, you can run any of the [available images](https://aerokube.com/images/latest/#_browser_image_information) provided free of charge by Selenoid.

__Note:__ If you use this service you don't need any other driver services (e.g. [wdio-chromedriver-service](https://www.npmjs.com/package/wdio-chromedriver-service)) anymore. All [browsers supported](https://aerokube.com/images/latest/#_browser_image_information) by selenoid can be started using this service.

__Note:__ You might notice we pull the version of selenoid with VNC enabled.  To take advantage of this, please check out the [wdio-selenoid-ui-service](https://github.com/JustSittinHere/wdio-selenoid-ui-service) for more information.

## Benefits of Selenoid

* Quickly change browser versions without having to install any software
* Consistent execution environment between local and CI
* Video Recording of all tests
* VNC "Live View" support to view the tests as they run, even on a headless ci server
* Specify any screen resolution and timezone without changing your system setup

## Installation

Before starting make sure you have [Docker](https://www.docker.com/) installed

The easiest way is to keep `wdio-selenoid-standalone-service` as a devDependency in your `package.json`.

```json
{
    "devDependencies": {
        "wdio-selenoid-standalone-service": "^1.0.0"
    }
}
```

You can simple do it by:

```bash
npm install wdio-selenoid-standalone-service --save-dev
```

or

```bash
yarn add wdio-selenoid-standalone-service --dev
```

Instructions on how to install `WebdriverIO` can be found [here.](https://webdriver.io/docs/gettingstarted)

## Configuration

In order to use the service you need to add `selenoid-standalone` to your service array and change the default wdio path prop to match selenoid

```js
export.config = {
    // ...
    path: 'wd/hub'
    services: [
        ['selenoid-standalone', { pathToBrowsersConfig: './browsers.json' }] // path relative to process.cwd()
    ],
    // ...
};
```

Next you need to create the `browsers.json` file which is a configuration file that tells Selenoid which browsers you want to support.  An example for chrome 88, 87 and FireFox 85 would be:

```json
{
    "chrome": {
        "default": "88.0",
        "versions": {
            "88.0": {
                "image": "selenoid/vnc:chrome_88.0",
                "port": "4444",
                "path": "/"
            },
            "87.0": {
                "image": "selenoid/vnc:chrome_87.0",
                "port": "4444",
                "path": "/"
            }
        }
    },
    "firefox": {
        "default": "85.0",
        "versions": {
            "88.0": {
                "image": "selenoid/vnc:firefox_85.0",
                "port": "4444",
                "path": "/wd/hub"
            }
        }
    }
}
```

The default value for each browser is what browser will be run if you do not supply a `browserVersion` prop within your capabilities.

__Note:__ Pay attention to the `path` as these can change depending on the browser image being used

More information about browsers.json can be found [here](https://aerokube.com/selenoid/latest/#_browser_images)

## Options

The following options can be added to the service options.  They are all optional

### skipAutoPullImages

Automatically pull docker images added to `browsers.json` that do not exist on your system

Type: `Boolean`

Default: `false`

### customSelenoidContainerName

When this service runs the selenoid docker image it will give it a custom name.  If you want to use your own name, you can override it here

Type: `String`

Default: `wdio_selenoid`

### terminateWdioOnError

As this service should be the only browser driver needed, if there is a problem starting it will issue a `SevereServiceError` execption and stop wdio from running.  If you want to disable this behaviour set this to false

Type: `Boolean`

Default: `true`

### selenoidVersion

If you want to always use a specific version of Selenoid, you can fix the version here.  If unset, this service will use the image tagged with latest-release

Type: `String`

Default: `latest-release`

### port

Port which the Selenoid container should use to accept incoming connections

Type: `Number`

Default: `4444`

## Warning

The following options are experimental and can cause unexpected problems.  Use with caution
### dockerArgs

Any additional arguments you want to pass to docker run when starting the container.  [docker run options](https://docs.docker.com/engine/reference/commandline/run/#options)

Type: `String[]`

Default: `null`

### selenoidArgs

Any additional arguments you want to pass to selenoid when starting the container.  [docs](https://aerokube.com/selenoid/latest)

Type: `String[]`

Default: `null`

## Example Options

```js
export.config = {
    // ...
    path: 'wd/hub'
    services: [
        [
            'selenoid-standalone', { 
                pathToBrowsersConfig: './browsers.json',
                skipAutoPullImages: 'false',
                customSelenoidContainerName: 'wdio-selenoid',
                terminateWdioOnError: true,
                selenoidVersion: 'latest-version',
                port: 4444,
                dockerArgs: ['-rm'],
                selenoidArgs: ['-limit', '10'],
            },
        ],
    ],
    // ...
};
```

## Troubleshooting

### I can't access localhost

As the browsers are now running inside a docker container, localhost is local to the container.  If you want to access localhost of the docker host, change the url from localhost to `host.docker.internal`.  Example `https://localhost:3000` becomes `https://host.docker.internal:3000`

### RequestError: Unexpected token Y in JSON at position 0 in "http://localhost:4444/session"

You need to set `path: 'wb/hub'` in your `wdio.conf.js` file as wdio will default to a path of `/` which Selenoid doesn't

### Request failed with status 400 due to Error: Requested environment is not available

`browers.json` is referencing a browser that is not supported by selenoid.  Supported list can be found [here](https://aerokube.com/selenoid/latest/#_browser_images)

### I want to use my own dockerhub mirror

Update the `browsers.json` file and change the image name to also include your mirror and this will be passed to docker when selecting the image

```json
{
    "chromex": {
        "default": "88.0",
        "versions": {
            "88.0": {
                "image": "my-docker-mirror.internal/selenoid/vnc:chrome_88.0",
                "port": "4444",
                "path": "/"
            }
        }
    }
}
```
