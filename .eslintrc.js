module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    'react-native/react-native': true,
    jest: true, // Explicitly enable Jest globals
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: [
    'react',
    'react-native',
    'react-hooks',
  ],
  rules: {
    // React rules
    'react/prop-types': 'off', // Disable prop-types as we're not using them
    'react/display-name': 'off',
    'react/jsx-uses-react': 'error',
    'react/jsx-uses-vars': 'error',
    
    // React hooks rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // React Native rules
    'react-native/no-unused-styles': 'warn',
    'react-native/no-inline-styles': 'warn',
    'react-native/no-color-literals': 'warn',
    
    // General rules
    'no-unused-vars': ['warn', { 
      'argsIgnorePattern': '^_', 
      'varsIgnorePattern': '^_',
      'ignoreRestSiblings': true
    }],
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    
    // Jest rules removed for compatibility
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  globals: {
    __DEV__: true,
    Platform: true, // Add Platform to globals
    fetch: true,
    Response: true,
    expect: true,
    it: true,
    describe: true,
    beforeEach: true,
    afterEach: true,
    jest: true,
  },
  // Overrides for specific file patterns
  overrides: [
    {
      files: ['**/__tests__/**/*.js', '**/*.test.js'],
      env: {
        jest: true,
      },
      // No additional rules needed as jest env is enabled
    },
    {
      files: ['*.old.js'],
      rules: {
        // Disable rules for legacy files
        'no-unused-vars': 'off',
        'react-hooks/exhaustive-deps': 'off',
      },
    },
  ],
};
