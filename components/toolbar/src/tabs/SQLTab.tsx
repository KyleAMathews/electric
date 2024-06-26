import React, { useState } from 'react'
import { Controlled as CodeMirrorControlled } from 'react-codemirror2'
import { ToolbarTabsProps } from '../tabs'

export default function SQLTab({ dbName, api }: ToolbarTabsProps): JSX.Element {
  const [code, setCode] = useState(
    'SELECT name FROM sqlite_schema\n' +
      "WHERE type='table'\n" +
      'ORDER BY name;',
  )
  const [response, setResponse] = useState('')
  const [history, setHistory] = useState('')
  const [active, setActive] = useState('query')

  function submitSQL() {
    setHistory(history + code + '\n\n')
    api.queryDb(dbName, { sql: code }).then(
      (rows) => {
        setResponse(JSON.stringify(rows, null, 4))
      },
      (err) => {
        setResponse('Error: ' + err)
      },
    )
  }

  function clearHistory() {
    setHistory('')
  }

  function renderQuery() {
    return (
      <div className="mirror-column">
        <div className="mirror-header">
          <span className="header-span">query</span>
          <span
            className="header-span header-span-button"
            onClick={setActive.bind(null, 'history')}
          >
            history
          </span>
        </div>
        <div className="mirror-in">
          <CodeMirrorControlled
            value={code}
            onBeforeChange={(_editor, _data, value) => {
              setCode(value)
            }}
            options={{
              tabSize: 4,
              mode: 'sql',
              theme: 'material',
              lineNumbers: true,
            }}
          />
        </div>
        <div className="mirror-ctls">
          <button id="submit-sql-button" onClick={submitSQL}>
            SUBMIT
          </button>
        </div>
      </div>
    )
  }

  function renderHistory() {
    return (
      <div className="mirror-column">
        <div className="mirror-header">
          <span
            className="header-span header-span-button"
            onClick={setActive.bind(null, 'query')}
          >
            query
          </span>
          <span className="header-span">history</span>
        </div>
        <div className="mirror-in">
          <CodeMirrorControlled
            value={history}
            onBeforeChange={(_editor, _data, _value) => {}}
            options={{
              readOnly: true,
              tabSize: 4,
              mode: 'sql',
              theme: 'material',
              lineNumbers: false,
            }}
          />
        </div>
        <div className="mirror-ctls">
          <button id="submit-sql-button" onClick={clearHistory}>
            CLEAR
          </button>
        </div>
      </div>
    )
  }

  function switchInput() {
    switch (active) {
      case 'query':
        return renderQuery()
      case 'history':
        return renderHistory()
      default:
        return <div></div>
    }
  }

  return (
    <div className="mirror-wrapper">
      {switchInput()}
      <div className="mirror-column">
        <div className="mirror-header">results</div>
        <div className="mirror-in">
          <CodeMirrorControlled
            value={response}
            onBeforeChange={(_editor, _data, _value) => {}}
            options={{
              readOnly: true,
              tabSize: 4,
              mode: 'json',
              theme: 'material',
            }}
          />
        </div>
        <div className="mirror-ctls">
          <button onClick={setResponse.bind(null, '')}>CLEAR</button>
        </div>
      </div>
    </div>
  )
}
