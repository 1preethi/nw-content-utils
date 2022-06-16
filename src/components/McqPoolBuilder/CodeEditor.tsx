import React from "react"

import AceEditor from "react-ace";

// import "ace-builds/src-noconflict/mode-javascript";
// import "ace-builds/src-noconflict/theme-monokai";
// import "ace-builds/src-noconflict/ext-language_tools";
// import "ace-builds/src-noconflict/ext-searchbox";
// import "ace-builds/src-noconflict/keybinding-vscode";

import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/ext-language_tools";

const defaultCode = `from io import StringIO 
import sys

class Capturing(list):
    def __enter__(self):
        self._stdout = sys.stdout
        sys.stdout = self._stringio = StringIO()
        return self
    def __exit__(self, *args):
        self.extend(self._stringio.getvalue().splitlines())
        del self._stringio    # free up some memory
        sys.stdout = self._stdout
with Capturing() as output:
    # Write the code here
    # (Note: Maintain Indentation)
    # Do not edit/modify above this line

    # Do not edit/modify after this line
list(output)`


const CodeEditor = (props) => {
    const { changeEditor } = props
    return (
        <div>
            <AceEditor
                width="100%"
                fontSize={18}
                height="400px"
                defaultValue={defaultCode}
                mode="python"
                theme="github"
                onChange={changeEditor}
                name="codeEditor"
                editorProps={{ $blockScrolling: true }}
                setOptions={{ useWorker: true }} />
        </div>)
}

export default CodeEditor;

//FIX: Not able to override styles


