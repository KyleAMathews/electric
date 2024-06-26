import React, { useEffect } from 'react'

import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/material.css'
import 'codemirror/mode/sql/sql'
import style from './index.css'

import logo from './logo.svg'
import { useState } from 'react'
import ReactDOM from 'react-dom/client'

import ToolbarTabs from './tabs'
import { ToolbarInterface } from './api/interface'
import { Toolbar } from './api/toolbar'
import { ElectricClient } from 'electric-sql/client/model'

import { Registry, GlobalRegistry } from 'electric-sql/satellite'

export type ToolbarProps = {
  api: ToolbarInterface
}

function ElectricToolbar({ api }: ToolbarProps) {
  const [hidden, setHidden] = useState(true)
  const [dbNames, setDbNames] = useState<Array<string>>([])
  const [dbName, setDbName] = useState('')

  useEffect(() => {
    const names = api.getSatelliteNames()
    setDbNames(names)
    if (names.length > 0) {
      setDbName(names[0])
    }
  }, [])

  function handleClick() {
    setHidden(!hidden)
  }

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    setDbName(e.target.value)
  }

  if (hidden) {
    return (
      <div className="Toolbar Toolbar-hidden">
        <header className="Toolbar-header Toolbar-header-hidden">
          <img src={logo} className="Toolbar-logo" alt="logo" />
          <span className="nav-text">ElectricSQL Debug Tools</span>
          <button onClick={handleClick}>SHOW</button>
        </header>
      </div>
    )
  } else {
    return (
      <div className="Toolbar">
        <header className="Toolbar-header">
          <img src={logo} className="Toolbar-logo" alt="logo" />
          <span className="nav-text">ElectricSQL Debug Tools</span>
          <button onClick={handleClick}>HIDE</button>
          <select onInput={handleSelect}>
            {dbNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </header>
        <ToolbarTabs dbName={dbName} api={api} />
      </div>
    )
  }
}

export function clientApi(registry: GlobalRegistry | Registry) {
  return new Toolbar(registry)
}

export function addToolbar(electric: ElectricClient<any>) {
  const toolbarApi = clientApi(electric.registry)
  const toolbarDiv = document.createElement('div')
  toolbarDiv.setAttribute('id', 'electric-toolbar')
  toolbarDiv.setAttribute('class', 'electric-toolbar')

  const styleTag = document.createElement('style')
  styleTag.innerHTML = style
  document.head.appendChild(styleTag)

  document.body.appendChild(toolbarDiv)
  const toolbarRoot = ReactDOM.createRoot(
    document.getElementById('electric-toolbar') as HTMLElement,
  )
  toolbarRoot.render(<ElectricToolbar api={toolbarApi} />)
}
