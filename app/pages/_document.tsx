import Document, { Head, Html, Main, NextScript } from 'next/document';
import React from 'react';

import createEmotionServer from '@emotion/server/create-instance';
import createCache from '@emotion/cache';

class MyDocument extends Document {
  public static getInitialProps = async (ctx) => {
    // Render app and page and get the context of the page with collected side effects.
    const originalRenderPage = ctx.renderPage;

    // You can consider sharing the same emotion cache between all the SSR requests to speed up performance.
    // However, be aware that it can have global side effects.
    const cache = createCache({ key: 'css' });
    const { extractCriticalToChunks } = createEmotionServer(cache);

    ctx.renderPage = () =>
      originalRenderPage({
        // eslint-disable-next-line react/display-name
        enhanceApp: (App) => (props) => <App emotionCache={cache} {...props} />,
      });

    const initialProps = await Document.getInitialProps(ctx);
    // This is important. It prevents emotion to render invalid HTML.
    // See https://github.com/mui-org/material-ui/issues/26561#issuecomment-855286153
    const emotionStyles = extractCriticalToChunks(initialProps.html);
    const emotionStyleTags = emotionStyles.styles.map((style) => (
      <style
        data-emotion={`${style.key} ${style.ids.join(' ')}`}
        key={style.key}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: style.css }}
      />
    ));

    return {
      ...initialProps,
      // Styles fragment is rendered after the app and page rendering finish.
      styles: [...React.Children.toArray(initialProps.styles), ...emotionStyleTags],
    };
  };

  public render() {
    let isThemeDark;
    if (this.props.__NEXT_DATA__.props.initialState.user) {
      isThemeDark = this.props.__NEXT_DATA__.props.initialState.user.showDarkTheme;
    } else {
      isThemeDark = true;
    }

    return (
      <Html lang="en">
        <Head>
          <meta charSet="utf-8" />
          <meta name="google" content="notranslate" />
          <meta name="theme-color" content="#0d1117" />

          <link
            rel="shortcut icon"
            href="https://storage.googleapis.com/async-await/async-favicon32.png"
          />

          <link rel="stylesheet" href="/fonts/server.css" />
          <link
            rel="stylesheet"
            href={
              isThemeDark
                ? 'https://storage.googleapis.com/async-await/nprogress-light-spinner.css'
                : 'https://storage.googleapis.com/async-await/nprogress-dark-spinner.css'
            }
          />
          <link
            rel="stylesheet"
            href={
              isThemeDark
                ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/10.1.1/styles/a11y-dark.min.css'
                : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/10.1.1/styles/a11y-light.min.css'
            }
          />

          <style>
            {`
              #__next {
                width: 100%;
                height: 100%;
              }
              a {
                color: ${isThemeDark ? '#fff !important' : '#0077ff !important'} ;
                text-decoration: none;
              }
              hr {
                border: none;
                height: 1px;
                color: ${isThemeDark ? '#fff !important' : '#828282 !important'};
                background-color: ${isThemeDark ? '#fff !important' : '#828282 !important'};
              }
              table {
                border-collapse: collapse;
                margin: 15px 0px;
              }
              th, td {
                border: 1px solid #a1a1a1 !important;
              }
              th, td {
                line-height: 1.5em;
                padding: 10px;
              }

              /* width */
              ::-webkit-scrollbar {
                width: 13px;
              }

              /* Track */
              ::-webkit-scrollbar-track {
                border: 1px solid #b0b0b0;
              }

              /* Handle */
              ::-webkit-scrollbar-thumb {
                background: #c0c0c0;
              }

              /* Handle on hover */
              ::-webkit-scrollbar-thumb:hover {
                background: #a0a0a0;
              }

              .MuiSelect-select.MuiSelect-select {
                display: flex;
                align-items: center;
              }
              textarea#message-editor {
                overflow: hidden !important;
              }
            `}
          </style>
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
