"use client";

import React, { ReactNode } from 'react';
import { PersistGate } from 'redux-persist/integration/react';
import { Provider } from 'react-redux';
import { persistStore, persistReducer } from 'redux-persist';
import store from '@/store/store';

const persistor = persistStore(store);

const ClientProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          {children}
        </PersistGate>
      </Provider>
    </div>
  );
};

export default ClientProvider;
