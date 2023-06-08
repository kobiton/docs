## Documentation
Kobiton Help Documentation

### Setup development
- `node` exact version: >=16.x
- Install `yarn` v1.22.4 or newer

### Other commands

```
yarn install
yarn build
```

### Build docker image
- To build docker documentation: `docker build -t kobiton/documentation:1.0 -f docker/documentation/Dockerfile .`
- To build docker portal-help:`docker build -t kobiton/portal-help:1.0 -f docker/portal-help/Dockerfile .`
