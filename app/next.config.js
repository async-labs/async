const withTM = require('next-transpile-modules')(['@mui/material', '@mui/icons-material']); // eslint-disable-line

const withBundleAnalyzer = require('@next/bundle-analyzer')({ // eslint-disable-line
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(
  withTM({
    typescript: {
      ignoreBuildErrors: true,
    },
    poweredByHeader: false,
    swcMinify: true,
    experimental: {
      forceSwcTransforms: true,
      modularizeImports: {
        '@mui/material/?(((\\w*)?/?)*)': {
          transform: '@mui/material/{{ matches.[1] }}/{{member}}',
        },
        '@mui/icons-material/?(((\\w*)?/?)*)': {
          transform: '@mui/icons-material/{{ matches.[1] }}/{{member}}',
        },
      },
    },
  }),
);
