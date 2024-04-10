class ExceptionComment {
    constructor(exception) {
        this.exception = exception
        this.explanation = null
        this.reason = null
        this.solution_user = null
        this.solution_developer = null
        this.show_message = false
    }
}

class JavaLangParser {
    constructor() {
        this.processors = {
            'java.lang.RuntimeException': (exception) => {
                let c = new ExceptionComment(exception)
                const REGEX_ENTRY_POINT = /Could not execute entrypoint stage '(main|client|server)' due to errors, provided by '([\w\d_]+)'!/i
                let entry_point = exception.message.trim().match(REGEX_ENTRY_POINT)
                if (entry_point) {
                    c.exception = `运行Mod ${entry_point[2]}的${entry_point[1]}初始化代码时出错`
                    c.reason = `可能因为各种原因导致`
                    c.solution_user = '看下一个报错'
                    c.solution_developer = '检查后续抛出的异常'
                    return c
                }
            }, 'java.lang.UnsupportedClassVersionError': (exception) => {
                let c = new ExceptionComment(exception)
                const REGEX = /([\w\d/]+) has been compiled by a more recent version of the Java Runtime \(class file version ([\d]+)\.0\), this version of the Java Runtime only recognizes class file versions up to ([\d]+)/i
                let r = exception.message.trim().match(REGEX)
                if (r) {
                    c.exception = '类版本错误'
                    c.reason = `使用的Java版本过低，类${r[1]}的版本为${r[2]}.0，而当前JVM只支持到${r[3]}`
                    c.solution_user = `使用Java${r[2] - 44}启动MC`
                    c.solution_developer = `将开发环境使用的JDK更改为JDK${r[2] - 44}，或使用JDK${r[3] - 44}重新编译类文件`
                    return c
                }
            },
        }
    }
    load = async () => {
        this.data = await fetch('../exception/java.lang.json').then(res => res.json())
    }
    parse = (exception) => {
        let cfg = this.data[exception.exception]
        if (cfg) {
            if (cfg.processor) return this.processors[exception.exception](exception)
            let c = new ExceptionComment(exception)
            c.exception = cfg.exception
            c.reason = cfg.reason
            c.solution_user = cfg.solution_user ?? cfg.solution
            c.solution_developer = cfg.solution_developer ?? cfg.solution
            c.show_message = cfg.show_message
            return c
        }
    }
}