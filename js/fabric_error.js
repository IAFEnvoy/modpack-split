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

const parse = async (stack, logMethod) => {
    let javaLangParser = new JavaLangParser()
    await javaLangParser.load()
    let errors = structuredClone(stack.subException)
    errors.unshift(stack)
    for (let error of errors) {
        logMethod('------')
        logMethod(`${error.exception} | 严重错误：${error.critical ? '是' : '否'}`)
        let result = javaLangParser.parse(error)
        if (result) {
            if (result.show_message)
                logMethod('原始信息：' + error.message)
            logMethod('解释：' + result.exception)
            logMethod('可能原因：' + result.reason)
            logMethod('解决方案：')
            logMethod('玩家：' + result.solution_user)
            logMethod('开发者：' + result.solution_developer)
        } else logMethod('暂未收录解释和解决方案')
        logMethod('可能导致出错的包：')
        logMethod((Array.from(new Set(error.trace.filter(x => internalPackages.every(v => !x.package.startsWith(v))).map(x => x.package)))).join(', '))
    }
}