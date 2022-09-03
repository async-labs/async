import React from 'react';

const Loading = ({ text, style = {} }: { text: string; style?: React.CSSProperties }) => {
  return (
    <p suppressHydrationWarning style={{ ...style }}>
      {text}
    </p>
  );
};

export default Loading;
