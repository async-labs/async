// done

import * as CryptoJS from 'crypto-js';

import 'isomorphic-unfetch';
// import { loadEnvConfig } from '@next/env';

import { getStore } from '../store';
import { makeQueryString } from './makeQueryString';

// import notify from '../notify';

// https://github.com/vercel/next.js/issues/7755
// https://github.com/vercel/next.js/issues/12269
// loadEnvConfig('./', process.env.NODE_ENV !== 'production');

// https://nodejs.org/en/knowledge/cryptography/how-to-use-crypto-module/#hmac

const dev = process.env.NODE_ENV !== 'production';

const apiServerUrl = dev
  ? process.env.NEXT_PUBLIC_API_SERVER_ENDPOINT
  : process.env.NEXT_PUBLIC_PRODUCTION_API_SERVER_ENDPOINT;

export default async function sendRequestAndGetResponse(path, opts: any = {}) {
  const { request, type, teamId } = opts;

  const qs = (opts.qs && `?${makeQueryString(opts.qs)}`) || '';

  const store = getStore();

  let fullUrl;
  let signature;
  let headers;

  if (type === 'externalServices') {
    fullUrl = `${path}${qs}`;

    headers = Object.assign(
      {
        'x-async-t': teamId,
      },
      opts.headers || {},
    );
  }

  if (type === 'apiServer') {
    if (apiServerUrl) {
      fullUrl = `${apiServerUrl}${path}${qs}`;
    }

    signature = await CryptoJS.AES.encrypt(
      'api-server',
      process.env.NEXT_PUBLIC_ENCRYPTION_KEY,
    ).toString();

    headers = Object.assign(
      {
        'Content-type': 'application/json; charset=UTF-8',
        'x-async-signature': signature,
        'x-async-t': teamId,
      },
      opts.headers || {},
    );
  }

  if (request && request.headers && request.headers.cookie) {
    headers.cookie = request.headers.cookie;
  }

  if (fullUrl) {
    const response = await fetch(
      fullUrl,
      Object.assign({ method: 'POST', credentials: 'include' }, opts, { headers }),
    );

    const text = await response.text();
    if (response.status >= 400) {
      console.error('response.status', response.status);
      throw new Error(text);
    }

    try {
      const data = JSON.parse(text);

      if (data.error) {
        if (
          response.status === 201 &&
          data.error === 'You are logged out. Please log in.' &&
          type !== 'externalServices'
        ) {
          if (store && store.currentUser && store.currentUser.isLoggedIn && !store.isServer) {
            store.currentUser.logoutStoreMethod();
          }
        }

        return data;
      }

      if (store && store.currentUser && !store.currentUser.isLoggedIn && !store.isServer) {
        store.currentUser.loginStoreMethod();
      }

      return data;
    } catch (err) {
      if (err instanceof SyntaxError) {
        return text;
      }

      throw err;
    }
  }

  // review
  return { user: null };
}
