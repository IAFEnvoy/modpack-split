const logToPage = (content) => {
    let obj = document.getElementById('logs');
    obj.innerHTML += content + '\n';
    obj.scrollTop = obj.scrollHeight
}

const readEnvironment = async (jarFile) => {
    let forgeConfig = jarFile.file('META-INF/mods.toml')
    let fabricConfig = jarFile.file('fabric.mod.json')
    console.log(forgeConfig, fabricConfig)
    if (forgeConfig && !document.getElementById('fabric').checked) {
        logToPage('检测到为Forge Mod')
        let forgeToml, side
        try {
            forgeToml = await forgeConfig.async('string').then(x => x.split('\n'))
            let flag = false;
            for (let i = 0; i < forgeToml.length; i++) {
                if (forgeToml[i].includes('[[dependencies')) break;
                if (forgeToml[i].includes('[[mods]]')) {
                    flag = true;
                    continue;
                }
                if (flag) {
                    let s = forgeToml[i]
                    while (s.startsWith(' ')) s = s.slice(1)
                    if (s.startsWith('side=')) {
                        side = s.replaceAll('side=', '').replaceAll('"', '').replaceAll(' ', '').toLowerCase()
                        break;
                    }
                }
            }
        } catch (e) {
            console.error(e)
            return logToPage('加载META-INF/mods.toml过程中出错，默认为双端Mod')
        }
        console.log(forgeToml, side)
        return side
    } else if (fabricConfig && !document.getElementById('forge').checked) {
        logToPage('检测到为Fabric Mod')
        let fabricJson
        try {
            fabricJson = JSON.parse(await fabricConfig.async('string'))
        } catch (e) {
            console.error(e)
            return logToPage('加载fabric.mod.json过程中出错，默认为双端Mod')
        }
        console.log(fabricJson)
        return fabricJson.environment
    } else return logToPage('无法检测类型，可能为库或者Optifine')
}

const resolvePack = async () => {
    document.getElementById('logs').innerHTML = ''
    //获取文件并解析zip
    const fileInput = document.getElementById('zipFileInput')
    const file = fileInput.files[0]
    if (!file)
        return alert('请选择一个zip文件')
    const fileName = file.name.replaceAll('.mrpack', '')
    const zipData = new JSZip()
    await zipData.loadAsync(file)
    console.log(zipData)
    logToPage('整合包上传完成')
    //读取Modrinth配置文件
    let modrinthConfig = zipData.file('modrinth.index.json')
    if (!modrinthConfig) return alert('此文件不是Modrinth打包文件！')
    let fileContent = JSON.parse(await modrinthConfig.async('string'))
    console.log(fileContent)
    //进行深拷贝
    let clientZip = zipData.clone(), serverZip = zipData.clone()
    let clientPack = structuredClone(fileContent), serverPack = structuredClone(fileContent)
    logToPage('整合包解析完成')
    //处理托管部分
    if (!document.getElementById('mcbbs').checked) {//只有mcbbs格式没有远程文件
        logToPage('开始处理托管部分')
        for (let i = 0; i < fileContent.files.length; i++) {
            let data = fileContent.files[i];
            logToPage(`开始处理${data.path} (${i + 1}/${fileContent.files.length})`)
            console.log(data)
            let url = data.downloads[0];
            let apiUrl = 'https://api.modrinth.com/v2/project/' + url.split('/')[4]
            logToPage('开始获取：' + apiUrl)
            let success = true;
            let info = await fetch(apiUrl).then(res => {
                if (res.ok) return res.json()
                success = false
            })
            if (!success) {
                logToPage('加载数据过程中出错，默认为双端Mod')
                continue;
            }
            let environment = '*';
            if (info.client_side == 'unsupported') environment = 'server'
            if (info.server_side == 'unsupported') environment = 'client'
            if (environment == 'client') {
                logToPage('此Mod为纯客户端Mod')
                //从服务端部分删除
                serverPack.files = serverPack.files.filter(x => x.path != data.path)
            } else if (environment == 'server') {
                logToPage('此Mod为纯服务端Mod')
                //从客户端部分删除
                clientPack.files = clientPack.files.filter(x => x.path != data.path)
            } else
                logToPage('此Mod为双端Mod')
        }
        logToPage('托管部分处理完成')
        clientZip.file('modrinth.index.json', JSON.stringify(clientPack))
        serverZip.file('modrinth.index.json', JSON.stringify(serverPack))
    }
    //处理override部分
    logToPage('开始处理非托管部分')
    let modFolder = zipData.folder('overrides').folder('mods')
    console.log(modFolder)
    let externalMods = []
    modFolder.forEach((relativePath, file) => {
        if (!relativePath.includes('/'))
            externalMods.push(file)
    })
    console.log(externalMods)
    for (let i = 0; i < externalMods.length; i++) {
        logToPage(`开始处理${externalMods[i].name}`)
        let jarFile = await new JSZip().loadAsync(await externalMods[i].async('blob'))
        logToPage('Jar文件加载完成')
        let environment = await readEnvironment(jarFile)
        if (environment == 'client') {
            logToPage('此Mod为纯客户端Mod')
            //从服务端部分删除
            serverZip.remove(externalMods[i].name)
        } else if (environment == 'server') {
            logToPage('此Mod为纯服务端Mod')
            //从客户端部分删除
            clientZip.remove(externalMods[i].name)
        } else
            logToPage('此Mod为双端Mod')
    }
    logToPage('非托管部分处理完成')
    console.log(clientPack, serverPack)
    //保存
    if (document.getElementById('client-server').checked) {
        //保存客户端
        logToPage('正在打包：' + fileName + '-client.mrpack，请稍后')
        saveAs(await clientZip.generateAsync({ type: 'blob' }), fileName + '-client.mrpack')
        logToPage('打包完成')
    }
    if (!document.getElementById('test-none').checked) {
        //保存服务端
        logToPage('正在打包：' + fileName + '-server.mrpack，请稍后')
        saveAs(await serverZip.generateAsync({ type: 'blob' }), fileName + '-server.mrpack')
        logToPage('打包完成')
    }
}