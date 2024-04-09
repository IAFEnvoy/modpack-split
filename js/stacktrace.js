const REGEX_EXCEPTION_HEADER = /^(Caused by: )?([\w\d\.]+(error|exception))(\:\s(.*))?$/i
const REGEX_EXCEPTION_STACKTRACE = /^at ([\w\d\.]+)\.([\w\d\$]+)\.([\w\d\$<>-]+)\(([\w\d\.$]+)(:([\d]+))?\)/i
const REGEX_EXCEPTION_STACKTRACE_MORE = /^\.\.\. ([\d]+) more$/i

const parseStackTrace = (data) => {
    let lines = data.split('\n')
    let inTrace = false, inRoot = false, stacks = [], currentStack = {}, currentSubStack = {}
    for (let line of lines) {
        if (inTrace) {
            let more = line.trim().match(REGEX_EXCEPTION_STACKTRACE_MORE)
            if (more) {//is <... 1 more> like
                if (inRoot) {
                    currentStack.more = more[1]
                    stacks.push(currentStack)
                    currentStack = {}
                }
                else {
                    currentSubStack.more = more[1]
                    currentStack.subException.push(currentSubStack)
                    currentSubStack = {}
                }
                inTrace = inRoot = false
                continue
            } else {
                let trace = line.trim().match(REGEX_EXCEPTION_STACKTRACE)
                if (trace) {
                    let singleTrace = {
                        package: trace[1],
                        class: trace[2],
                        method: trace[3],
                        file: trace[4],
                        line: trace[6] ?? null
                    }
                    if (inRoot) currentStack.trace.push(singleTrace)
                    else currentSubStack.trace.push(singleTrace)
                    continue
                } else {
                    if (Object.keys(currentSubStack).length > 0)
                        currentStack.subException.push(currentSubStack)
                    currentSubStack = {}
                }
            }
        }
        let header = line.trim().match(REGEX_EXCEPTION_HEADER)
        if (header) {
            inTrace = true
            if (header[1]) {//has <Caused by: >
                if (Object.keys(currentSubStack).length > 0)
                    currentStack.subException.push(currentSubStack)
                currentSubStack = {
                    root: inRoot = false,
                    exception: header[2],
                    message: header[5] ?? null,
                    trace: []
                }
            } else {
                if (Object.keys(currentStack).length > 0)
                    stacks.push(currentStack)
                currentStack = {
                    root: inRoot = true,
                    exception: header[2],
                    message: header[5] ?? null,
                    trace: [],
                    subException: []
                }
            }
        } else {
            inTrace = false
            if (Object.keys(currentStack).length > 0)
                stacks.push(currentStack)
            currentStack = {}
        }
    }
    return stacks
}