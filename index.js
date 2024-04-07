const logToPage = (content) => {
    let obj = document.getElementById('logs');
    obj.innerHTML += content + '\n';
    obj.scrollTop = obj.scrollHeight
}

const uploadAndUnzip = async () => {
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
    const clientPack = structuredClone(fileContent)
    const serverPack = structuredClone(fileContent)
    logToPage('整合包解析完成')
    for (let i = 0; i < fileContent.files.length; i++) {
        let data = fileContent.files[i];
        logToPage(`开始处理${data.path} (${i + 1}/${fileContent.files.length})`)
        console.log(data)
        let url = data.downloads[0];
        logToPage('开始下载：' + url)
        let success = true;
        let jarFile = await fetch(url).then(function (response) {
            if (response.status === 200 || response.status === 0) {
                return Promise.resolve(response.blob())
            } else {
                return Promise.reject(new Error(response.statusText))
            }
        }).then(JSZip.loadAsync).catch(err => {
            console.log(err)
            success = false;
        })
        if (!success) {
            logToPage('加载Jar过程中出错，默认为双端Mod')
            continue;
        }
        logToPage('Jar文件下载完成')
        let forgeConfig = jarFile.file('META-INF/mods.toml')
        let fabricConfig = jarFile.file('fabric.mod.json')
        if (forgeConfig) {
            logToPage('检测到为Forge Mod')
        } else if (fabricConfig) {
            logToPage('检测到为Fabric Mod')
            let fabricJson
            try {
                fabricJson = JSON.parse(await fabricConfig.async('string'))
            } catch (e) {
                logToPage('加载fabric.mod.json过程中出错，默认为双端Mod')
                continue;
            }
            console.log(fabricJson)
            let environment = fabricJson.environment;
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
        } else if (!fabricConfig && !forgeConfig)
            logToPage('无法检测类型，可能为库或者Optifine')
    }
    console.log(clientPack, serverPack)
    logToPage('处理完成')
    //保存客户端
    zipData.file('modrinth.index.json', JSON.stringify(clientPack))
    logToPage('正在保存：' + fileName + '-client.mrpack')
    saveAs(await zipData.generateAsync({ type: 'blob' }), fileName + '-client.mrpack')
    zipData.file('modrinth.index.json', JSON.stringify(serverPack))
    //保存服务端
    logToPage('正在保存：' + fileName + '-server.mrpack')
    saveAs(await zipData.generateAsync({ type: 'blob' }), fileName + '-server.mrpack')
    logToPage('保存完成')
}