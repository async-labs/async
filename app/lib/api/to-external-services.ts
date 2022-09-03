import sendRequestAndGetResponse from './sendRequestAndGetResponse';

const type = 'externalServices';

// returns
export const uploadFileUsingSignedPutRequestApiMethod = (
  file: any,
  signedRequest: string,
  headers = {},
) =>
  sendRequestAndGetResponse(signedRequest, {
    type,
    method: 'PUT',
    body: file,
    headers,
  });
