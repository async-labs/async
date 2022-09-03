const dev = process.env.NODE_ENV !== 'production';
const API_SERVER_ENDPOINT = dev
  ? process.env.NEXT_PUBLIC_API_SERVER_ENDPOINT
  : process.env.NEXT_PUBLIC_PRODUCTION_API_SERVER_ENDPOINT;

const accountMenu = () => [
  {
    text: 'My Account',
    href: `/settings/my-account`,
    as: `/settings/my-account`,
    simple: true,
  },
  {
    text: 'My Billing',
    href: `/settings/my-billing`,
    as: `/settings/my-billing`,
    simple: true,
  },
  {
    separator: true,
  },
  {
    text: 'Log out',
    href: `${API_SERVER_ENDPOINT}/logout`,
    as: `${API_SERVER_ENDPOINT}/logout`,
    externalServer: true,
    simple: true,
  },
];

export { accountMenu };
