const internalPackages = [
    'java',
    'jdk.internal',
    'net.minecraft',
    'com.mojang',
    'net.fabricmc',
    'org.lwjgl',
    'com.google',
    'com.ibm',
]

class ExceptionComment {
    constructor(exception, cfg, comment) {
        this.exception = exception
        this.explanation = comment.explanation
        this.reason = comment.reason
        this.solution_user = comment.solution_user ?? comment.solution
        this.solution_developer = comment.solution_developer ?? comment.solution
        this.show_message = cfg.show_message
    }
    replaceHolders = (placeholders) => {
        Object.keys(placeholders).forEach(key => {
            let value = placeholders[key]
            this.explanation = this.explanation.replaceAll(key, value)
            this.reason = this.reason.replaceAll(key, value)
            this.solution_user = this.solution_user.replaceAll(key, value)
            this.solution_developer = this.solution_developer.replaceAll(key, value)
        })
    }
}

let processors = {}
const loadProcessor = (path) => {
    fetch(path).then(res => res.text()).then(text => jsyaml.load(text)).then(yml => processors = { ...processors, ...yml })
}
loadProcessor('../exception/java.lang.yml')

const applyMapping = (origin, mapping) => {
    if (mapping[origin]) return mapping[origin]
    var n = Number(origin)
    if (isNaN(n)) return origin
    if (mapping.add) return (+origin) + (+mapping.add)
    if (mapping.sub) return (+origin) + (+mapping.sub)
}

const getComment = (exception) => {
    let cfg = processors[exception.exception]
    if (cfg) {
        if (cfg.regex)
            for (let regex of cfg.regex) {
                let regexExpression = new RegExp(regex.pattern, regex.flag)
                let r = exception.message.trim().match(regexExpression)
                if (r) {
                    let placeholders = {}
                    let mapping = regex.mapping ?? cfg.mapping ?? {}
                    for (let i = 0; i < r.length; i++) {
                        placeholders[`{${i}}`] = r[i]
                        placeholders[`{${i}|}`] = applyMapping(r[i], mapping)
                    }
                    let comment = new ExceptionComment(exception, cfg, regex.comment ?? cfg.comment ?? {})
                    comment.replaceHolders(placeholders)
                    return comment
                }
            }
        if (cfg.comment)
            return new ExceptionComment(exception, cfg, cfg.comment)
    }
}

const excludeName = ['github']
const findModIdFromPackage = (package) => {
    let names = package.split('.'), flag = names[0].length <= 3 ? 1 : 0
    while (flag < names.length - 1 && (excludeName.includes(names[flag]) || names[flag].length <= 2)) flag++
    if (flag >= names.length - 1) return null
    return names[flag + 1]
}

const parsePackage = (trace) => {
    let packages = Array.from(new Set(trace.filter(x => internalPackages.every(v => !x.package.startsWith(v))).map(x => x.package)))
    return {
        packages: packages,
        modIds: Array.from(new Set(packages.map(x => findModIdFromPackage(x))))
    }
}

const parse = async (stack, logMethod) => {
    let errors = structuredClone(stack.subException)
    errors.unshift(stack)
    for (let error of errors) {
        logMethod('------')
        logMethod(`${error.exception} | 严重错误：${error.critical ? '是' : '否'}`)
        let result = getComment(error)
        if (result) {
            if (result.show_message)
                logMethod('原始信息：' + error.message)
            logMethod('解释：' + result.explanation)
            logMethod('可能原因：' + result.reason)
            logMethod('解决方案：')
            logMethod('玩家：' + result.solution_user)
            logMethod('开发者：' + result.solution_developer)
        } else logMethod('暂未收录解释和解决方案')
        let p = parsePackage(error.trace)
        logMethod('可能导致出错的Mod：' + p.modIds.join(', '))
        logMethod('可能导致出错的包：' + p.packages.join(', '))
    }
}