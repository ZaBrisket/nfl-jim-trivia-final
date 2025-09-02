
import React from 'react'
import { Outlet } from 'react-router-dom'
import { DatasetProvider } from '../state/dataset'
import { Game } from '../state/game'

export default function App(){
  return (
    <DatasetProvider>
      <Game.Provider>
        <Outlet />
      </Game.Provider>
    </DatasetProvider>
  )
}
