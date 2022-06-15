import { useEffect, useState, useMemo } from "react";

import { FormContainer, TextFieldElement } from 'react-hook-form-mui'
import Select from 'react-select';
import Chance from 'chance';
import { SelectTransform as ST } from 'selecttransform';
import ReactJson from 'react-json-view'
import loadable from '@loadable/component'

import '../styles/pool-generator.css'

import { CopyToClipboard } from 'react-copy-to-clipboard';
import Table from "./Table";

const ReactJson = loadable(() => new Promise((r, c) => import('react-json-view').then(result => r(result.default), c)))

const st = new ST();

import CodeEditor from "./CodeEditor";
import './mcqPoolBuilder.css'

let pythonCodeStart = `# Do not edit/modify above this line`

let pythonCodeEnd = `# Do not edit/modify after this line`

const inputTableColumns = [
    {
        Header: "Input Name",
        accessor: "inputName"
    },
    {
        Header: "Input Type",
        accessor: "inputType"
    },
    {
        Header: "Min",
        accessor: "min"
    },
    {
        Header: "Max",
        accessor: "max"
    },
    {
        Header: "Length",
        accessor: "length"
    },
    {
        Header: "Context Type",
        accessor: "contextType"
    },
    {
        Header: "Custom List",
        accessor: "customList"
    }
]

const templateTypesArray = [
    { "value": "QUESTION_AS_TEMPLATE", "label": "Question as Template" },
    { "value": "CODE_AS_TEMPLATE", "label": "Code as Template" },
    { "value": "CORRECT_OPTIONS_AS_TEMPLATE", "label": "Correct Options as Template" },
    { "value": "WRONG_OPTIONS_AS_TEMPLATE", "label": "Wrong Options as Template" },
]

const inputTypes = [
    "integer",
    "string",
    "bool",
    "custom"
]

const inputTypeDetails = {
    'integer': ['min', 'max'],
    "string": ['length'],
    "bool": [],
    "custom": []
}

const contextTypes = [
    { "value": "name", "label": "Person Name" },
    { "value": "animal", "label": "Animal Name" },
    { "value": "company", "label": "Company Name" },
    { "value": "country", "label": "Country Name" },
    { "value": "city", "label": "City Name" },
    { "value": "state", "label": "State Name" },
    { "value": "street", "label": "Street Name" },
    { "value": "month", "label": "Month Name" },
    { "value": "profession", "label": "Profession Name" },
    { "value": "weekDay", "label": "Week Day Name" }
]

const errorMsgs = {
    "pythonEvaluation": "Code Outputs and Correct Options are not same"
}


const formViews = ["QUESTION", "INPUTS"]


const Fallback = () => {
    return <div>Loading Code Editor...</div>;
};

export default function McqPoolBuilder() {

    const [outputJson, setOutputJson] = useState([])
    const [pyodideInstance, setPyodideInstance] = useState()
    const [isCopied, setIsCopied] = useState(false)
    const [chanceInstance, setChanceInstance] = useState()
    const [codes, setCodes] = useState([])
    const [errorMsg, setErrorMsg] = useState("")

    const columns = useMemo(
        () => inputTableColumns,
        [outputJson]
    );

    const [questionsData, setQuestionsData] = useState({})
    const [inputs, setInputs] = useState([])
    const [formView, setFormView] = useState(formViews[0])

    useEffect(() => {
        async function createAndReturnPyodideInstance() {
            let pyodide = await loadPyodide();
            return pyodide;
        }
        const instance = createAndReturnPyodideInstance()
        setPyodideInstance(instance)
    }, [])

    useEffect(() => {
        const chance = new Chance()
        setChanceInstance(chance)
    }, [])

    const getChanceRandomValueBasedOnInputType = (input) => {
        const { inputType, min, max, length, customList, contextType } = input

        let custom = customList?.split(',')

        switch (inputType) {
            case inputTypes[0]:
                return chanceInstance.integer({ min, max })
            case inputTypes[1]:
                switch (contextType) {
                    case contextTypes[0].value:
                        return chanceInstance.name({ length })
                    case contextTypes[1].value:
                        return chanceInstance.animal({ length })
                    case contextTypes[2].value:
                        return chanceInstance.company({ length })
                    case contextTypes[3].value:
                        return chanceInstance.country({ full: true, length })
                    case contextTypes[4].value:
                        return chanceInstance.city({ length })
                    case contextTypes[5].value:
                        return chanceInstance.state({ full: true, length })
                    case contextTypes[6].value:
                        return chanceInstance.street({ length })
                    case contextTypes[7].value:
                        return chanceInstance.month({ length })
                    case contextTypes[8].value:
                        return chanceInstance.profession({ length })
                    case contextTypes[9].value:
                        return chanceInstance.weekday({ length })
                    default:
                        return chanceInstance.string({ length })
                }
            case inputTypes[2]:
                return chanceInstance.bool()
            case inputTypes[3]:
                return chanceInstance.pickone(custom)
        }
    }

    const getGeneratedQuestionsData = () => {
        const { questionText, code, generateCount, cOptions, wOptions } = questionsData

        const createInputObject = () => {
            let inputObject = {}

            inputs.forEach(eachInputObj => {
                inputObject[eachInputObj.inputName] = getChanceRandomValueBasedOnInputType(eachInputObj)
            })
            return inputObject
        }

        let inputsData = []

        for (let i = 0; i < generateCount; i++) {
            inputsData.push(createInputObject())
        }

        const generatedQuestionsData = {
            questionText,
            code,
            inputs: inputsData,
            cOptions,
            wOptions
        }
        return generatedQuestionsData
    }

    const getCodeTemplate = (question: any) => {
        return ({
            "{{#each inputs}}": {
                questionId: chanceInstance.guid({ version: 4 }),
                questionText: question.questionText,
                code: question.code === undefined ? "" : question.code,
                concept: "",
                broadLevelConcept: "",
                variantName: "",
                // variantName: `${question.variantName}_{{$index+1}}`,
                cOptions: question.cOptions,
                wOptions: question.wOptions,
            }
        })
    }


    const getTransformedData = () => {
        let transformedData = st.transformSync(getCodeTemplate(getGeneratedQuestionsData()), getGeneratedQuestionsData())
        return transformedData
    }


    const shouldValidatePythonCodeOutputs = (selectedTemplateTypes) => {

        const shouldValidate = selectedTemplateTypes.includes(templateTypesArray[2]) || (selectedTemplateTypes.includes(templateTypesArray[3]))

        return shouldValidate
    }

    // useEffect(() => {
    //     async function evaluatePython(json) {
    //         let pyodide = await pyodideInstance;

    //         const getPythonOutput = (code) => {

    //             let pythonOutput = pyodide.runPython(code).toJs({ depth: 1 })

    //             return pythonOutput
    //         }



    //         const outputJsonWithPythonOutputs = [...json].map((eachObj, index) => {

    //             let codeOutput = getPythonOutput(eachObj.code)

    //             let object = { ...eachObj, code: getExtractedPythonCode(), cOptions: codeOutput }

    //             return object
    //         })


    //         const { templateTypes } = questionsData

    //         if (shouldValidatePythonCodeOutputs(templateTypes)) {



    //         }

    //         const getOutputJsonWithQuestionIds = () => {
    //             const updatedOutputJson = outputJsonWithPythonOutputs.map(eachObj => {
    //                 return { questionId: chanceInstance.guid({ version: 4 }), ...eachObj }
    //             })
    //             return updatedOutputJson
    //         }

    //         setOutputJson(getOutputJsonWithQuestionIds())

    //     }
    //     if (outputJson.length > 0 && getExtractedPythonCode() !== "" && !shouldValidatePythonCodeOutputs()) {
    //         evaluatePython(outputJson)
    //     }
    // }, [JSON.stringify(outputJson)])

    const onProceed = (data) => {
        const { cOptions, wOptions } = data // TODO:Add to util to convert into array when given string with , separated

        const cOPtionsArray = cOptions === undefined ? [] : cOptions.split(',')
        const wOPtionsArray = wOptions === undefined ? [] : wOptions.split(',')

        const updatedCOptions = cOPtionsArray.map(eachItem => isNaN(Number(eachItem)) ? eachItem : Number(eachItem))
        const updatedWOptions = wOPtionsArray.map(eachItem => isNaN(Number(eachItem)) ? eachItem : Number(eachItem))

        // TODO: Add to util to convert into integer if integer or string
        setQuestionsData(prevQuestionData => ({ ...prevQuestionData, ...data, cOptions: updatedCOptions, wOptions: updatedWOptions }))
        setFormView(formViews[1])

    }

    useEffect(() => {
        const extractInputs = (questionData) => {

            const regex = /{{input_\d*}}/g
            const inputsWithBrackets = questionData.match(regex)
            const inputsWithoutBrackets = inputsWithBrackets ? inputsWithBrackets.map(string => string.replace('{{', '').replace('}}', '')) : []
            return inputsWithoutBrackets
        }

        const getQuestionDataToExtractInputs = (templateType) => {
            const { questionText, code, cOptions, wOptions } = questionsData;

            switch (templateType) {
                case templateTypesArray[0].value:
                    return JSON.stringify(questionText)
                case templateTypesArray[1].value:
                    return JSON.stringify(code)
                case templateTypesArray[2].value:
                    return JSON.stringify(cOptions)
                case templateTypesArray[3].value:
                    return JSON.stringify(wOptions)
            }

        }

        const getInputsBasedOnTemplateType = () => {
            const { templateTypes } = questionsData

            const getInputs = (array, templateType) => {
                let data = getQuestionDataToExtractInputs(templateType.value)
                let inputs = extractInputs(data) //TODO: Need to add JSON stringify and parse as utils
                array.push(...inputs)
                return array
            }

            const inputsWithDuplicates = templateTypes.reduce(getInputs, [])
            const inputsWithoutDuplicates = Array.from(new Set(inputsWithDuplicates))

            const inputObjectsWithoutDuplicates = inputsWithoutDuplicates.map(eachInput => ({ inputName: eachInput, inputType: inputTypes[0] }))

            return inputObjectsWithoutDuplicates
        }

        if (questionsData.templateTypes) {
            setInputs(getInputsBasedOnTemplateType())
        }
    }, [formView]);


    const changeEditor = (value) => {
        let code = value
        setQuestionsData(prevQuestionData => ({ ...prevQuestionData, code }))
    }

    const renderQuestionForm = () => {
        return (<FormContainer
            onSuccess={onProceed}
        // defaultValues={{ "templateTypes": templateTypesArray[0], "questionText": 'print({input_1}, {input_2})', "generateCount": 3, "tagName": 'q_1' }}
        >
            <Select
                onChange={onChangeTemplateTypes}
                options={templateTypesArray}
                placeholder="Type of Template"
                isMulti={true}
            />
            {/* <MultiSelectElement menuItems={templateTypesArray} label="Type of Template" name="templateTypes" required /> */}
            <br />
            {typeof document !== "undefined" ? <CodeEditor changeEditor={changeEditor} /> : <Fallback />}
            {/* <br />
            <Editor
                height="100px"
                defaultLanguage="python"
                onChange={onChangeEditor}
            /> */}
            <TextFieldElement name="questionText" label="Question Text" required className="question-text-field" />
            <br />
            <TextFieldElement name="generateCount" label="No.of Variants to generate" required />
            <br />
            <TextFieldElement name="cOptions" label="Correct Options" />
            <br />
            <TextFieldElement name="wOptions" label="Wrong Options" />
            <br />
            <button type="submit">Proceed</button>
        </FormContainer>)
    }


    const renderFormView = () => {
        switch (formView) {
            case formViews[0]:
                return renderQuestionForm()
            case formViews[1]:
                return renderInputsForm()
        }

    }

    const renderQuestionDataRow = (key) => {

        // const keyValue = Object.keys(questionsData).length > 0 ? JSON.stringify(questionsData[key]) : JSON.stringify(actionData?.questionsData[key])

        const keyValue = JSON.stringify(questionsData[key])

        return (
            <li className="question-data-row">
                <p>{key}</p>
                <p>{keyValue}</p>
            </li>
        )

    }

    const renderInputsTable = (inputsData) => {
        return (inputsData.length > 0 ? <Table columns={columns} data={inputsData} /> : null)

    }

    const renderConfigurationPreviewer = () => {

        let questionsDataKeys = Object.keys(questionsData)

        // const questionsKeys = questionsDataKeys.length > 0 ? questionsDataKeys : Object.keys(actionData?.questionsData)
        // const inputsList = inputs === undefined ? actionData?.inputs : inputs

        const questionsKeys = questionsDataKeys
        const inputsList = inputs

        //TODO: can make as util

        return (
            <div className="configuration-previewer">
                <p>Configuration Previewer</p>
                <ul>
                    {questionsKeys.map(eachKey => renderQuestionDataRow(eachKey))}
                </ul>
                {renderInputsTable(inputsList)}
            </div>
        )

    }

    const renderIntegerRange = (input) => {
        const { inputName } = input
        // return (
        //     <>
        //         <TextFieldElement name={`${inputName}Min`} />
        //         <TextFieldElement name={`${inputName}Max`} />
        //     </>
        // )

        return (
            <>
                <input name={`${inputName}Min`} placeholder="Min" onChange={onChangeMin} />
                <input name={`${inputName}Max`} placeholder="Max" onChange={onChangeMax} />
            </>
        )
    }

    const deleteOtherInputTypeKeys = (inputObj) => {
        const { inputType } = inputObj

        const inputTypeDetailsKeys = Object.keys(inputTypeDetails)

        inputTypeDetailsKeys.map(eachInputType => {
            if (eachInputType !== inputType) {
                inputTypeDetails[eachInputType].forEach(eachKey => delete inputObj[eachKey])
            }
        })

    }

    const onChangeMin = (event) => {
        const { value, name } = event.target
        const updatedInputs = [...inputs].map(eachInput => {
            if (name.includes(eachInput.inputName)) {
                eachInput.min = Number(value) //TODO: Need to write as util to convert to num
            }
            return eachInput
        })
        setInputs(updatedInputs)
    }

    const onChangeMax = (event) => {
        const { value, name } = event.target
        const updatedInputs = [...inputs].map(eachInput => {
            if (name.includes(eachInput.inputName)) {
                eachInput.max = Number(value)
            }
            return eachInput
        })
        setInputs(updatedInputs)
    }

    const onChangeLength = (event) => {
        const { value, name } = event.target
        const updatedInputs = [...inputs].map(eachInput => {
            if (name.includes(eachInput.inputName)) {
                eachInput.length = Number(value)
            }
            return eachInput
        })
        setInputs(updatedInputs)
    }

    const onChangeCustomList = (event) => {
        const { value, name } = event.target
        const updatedInputs = [...inputs].map(eachInput => {
            if (name.includes(eachInput.inputName)) {
                eachInput.customList = value
            }
            return eachInput
        })
        setInputs(updatedInputs)
    }

    const onChangeTemplateTypes = (selectedOptions) => {
        const templateTypes = selectedOptions

        setQuestionsData(prevQuestionData => ({ ...prevQuestionData, templateTypes }))
    }

    const onChangeContextType = (selectedOption, event) => {

        const { name } = event

        const updatedInputs = [...inputs].map(eachInput => {

            if (name.includes(eachInput.inputName)) {
                return { ...eachInput, contextType: selectedOption.value }
            }
            return { ...eachInput }
        })

        setInputs(updatedInputs)

    }

    const renderStringRange = (input) => {
        const { inputName } = input
        // return (
        //     <TextFieldElement name={`${inputName}Length`} />
        // )

        return (
            <>
                <Select options={contextTypes} onChange={onChangeContextType} name={`${inputName}ContextType`} />
                <input name={`${inputName}Length`} placeholder="Length" onChange={onChangeLength} />
            </>
        )
    }

    const renderCustomRange = (input) => {
        const { inputName } = input

        return (
            <input name={`${inputName}Custom`} placeholder="Custom List" onChange={onChangeCustomList} />
        )
        // return (
        //     <TextFieldElement name={`${inputName}Custom`} />
        // )
    }

    const renderFieldsBasedOnInputType = (input) => {
        const { inputType } = input
        switch (inputType) {
            case inputTypes[0]:
                return renderIntegerRange(input)
            case inputTypes[1]:
                return renderStringRange(input)
            case inputTypes[2]:
                return null
            case inputTypes[3]:
                return renderCustomRange(input)
        }
    }

    const onChangeInputName = (event) => {
        const { value, name } = event.target
        const updatedInputs = [...inputs].map(eachInput => {
            if (name.includes(eachInput.inputName)) {
                eachInput.inputName = value
            }
            return eachInput
        })
        setInputs(updatedInputs)
    }

    const onChangeInputType = (event) => {
        const { value, name } = event.target
        const updatedInputs = [...inputs].map(eachInput => {
            if (name.includes(eachInput.inputName)) {
                eachInput.inputType = value
                deleteOtherInputTypeKeys(eachInput)
            }
            return eachInput
        })
        setInputs(updatedInputs)
    }

    const renderInputRow = (input) => {

        const { inputName, inputType } = input

        return (
            <div key={inputName}>
                <input placeholder="Input Name" value={inputName} name={`${inputName}InputName`} onChange={onChangeInputName} />
                <select value={inputType} onChange={onChangeInputType} name={`${inputName}InputType`}>
                    {inputTypes.map(eachInputType => <option value={eachInputType}>{eachInputType}</option>)}
                </select>
                {renderFieldsBasedOnInputType(input)}
            </div>
        )

        // return (
        //     <FormContainer key={inputName} defaultValues={{'input_1inputName': 'input_1', 'input_1inputType': 'integer'}}>
        //         <TextFieldElement name={`${inputName}inputName`} label="Input Name" />
        //         <SelectElement options={inputTypes} label="Input Type" name={`${inputName}inputType`} value={inputType} onChange={onChangeInputType} />
        //         {renderFieldsBasedOnInputType(input)}
        //     </FormContainer>
        // )

    }

    async function getEvaluatedPythonOutputs(json) {
        let pyodide = await pyodideInstance;

        const getPythonOutput = (code) => {

            let pythonOutput = pyodide.runPython(code).toJs({ depth: 1 })

            return pythonOutput
        }


        const outputJsonWithPythonOutputs = [...json].map((eachObj, index) => {

            let fullCode = codes.length > 0 ? codes[index] : eachObj.code;

            let codeOutput = getPythonOutput(eachObj.code)

            let object = { ...eachObj, code: eachObj.code, cOptions: codeOutput }

            return object
        })

        return outputJsonWithPythonOutputs
    }

    const getExtractedPythonCode = () => {
        if (questionsData.code === undefined) {
            return ""
        }
        return questionsData.code.split(pythonCodeStart)[1].split(pythonCodeEnd)[0].trim().replace("\n    ", "\n")
    }



    const setCodeEditorValues = (codes) => {
        setCodes(codes)
    }

    const onGenerateData = async () => {
        const outputJSON = getTransformedData()

        setCodeEditorValues(outputJSON.map(eachObj => eachObj.code))

        if (getExtractedPythonCode() !== "" && !shouldValidatePythonCodeOutputs(questionsData.templateTypes)) {

            const outputJSONWithPythonOutputs = await getEvaluatedPythonOutputs(outputJSON)

            const extractedPythonOutputJSON = outputJSONWithPythonOutputs.map(eachObj => ({ ...eachObj, code: getExtractedPythonCode() }))

            setOutputJson(extractedPythonOutputJSON)
        }
        else {
            const extractedPythonOutputJSON = outputJSON.map(eachObj => ({ ...eachObj, code: getExtractedPythonCode() }))

            setOutputJson(extractedPythonOutputJSON)
        }
    }

    const onValidatePythonCodeOutputs = () => {
        const stringifiedOutputJson = JSON.stringify(outputJson)

        const stringifiedUpdatedOutputJson = JSON.stringify(getEvaluatedPythonOutputs(outputJson))

        if (stringifiedOutputJson !== stringifiedUpdatedOutputJson) {
            setErrorMsg(errorMsgs.pythonEvaluation)
            throw new Error("Code Outputs and Correct Options are not same")
        }
        else {
            setErrorMsg("")
        }
    }

    const onCopyCode = () => {
        setIsCopied(true)
    }

    const renderInputsForm = () => {

        return (
            <div>
                {inputs?.map(eachInput => renderInputRow(eachInput))}
                <button onClick={onGenerateData}>Generate Data</button>
            </div>
        )

    }

    return (
        <div className="app-container">
            <div className="form-container">
                {renderFormView()}
                {/* {questionsData && inputs &&
                    <form id="form" method="post">
                        <input value={JSON.stringify(questionsData)} hidden name="questionsData" />
                        <input value={JSON.stringify(inputs)} hidden name="inputs" />
                        
                    </form>
                } */}
                {outputJson.length > 0 &&
                    <>
                        {getExtractedPythonCode(questionsData.code) !== "" && shouldValidatePythonCodeOutputs(questionsData.templateTypes) ? <button onClick={onValidatePythonCodeOutputs}>Validate Python Code Outputs</button> : null}
                        <p>{errorMsg}</p>
                        <CopyToClipboard text={JSON.stringify(outputJson)}
                            onCopy={onCopyCode}>
                            {isCopied ? <span>Copied</span> : <button>Copy to clipboard</button>}
                        </CopyToClipboard>
                        <ReactJson src={outputJson} style={{ whiteSpace: 'pre' }} />
                    </>}
            </div>
            {/* {(questionsData && inputs || outputJson.length > 0) && renderConfigurationPreviewer()} */}
            {renderConfigurationPreviewer()}
        </div>
    );
}


