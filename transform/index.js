const logToPage = (content) => {
    let obj = document.getElementById('logs');
    obj.innerHTML += content + '\n';
    obj.scrollTop = obj.scrollHeight
}

const removeOverride = (s) => s.replace('override/', '')

const filterSize = (size) => {
    if (!size) return '';
    return size < 1024 ? size + ' B' :
        size < pow1024(2) ? (size / 1024).toFixed(2) + ' KB' :
            size < pow1024(3) ? (size / pow1024(2)).toFixed(2) + ' MB' :
                size < pow1024(4) ? (size / pow1024(3)).toFixed(2) + ' GB' :
                    (size / pow1024(4)).toFixed(2) + ' TB'
}

const pow1024 = (num) => Math.pow(1024, num)

const resolvePack = async () => {
    document.getElementById('logs').innerHTML = ''
    //获取文件并解析zip
    const fileInput = document.getElementById('zipFileInput')
    const file = fileInput.files[0]
    if (!file)
        return alert('请选择一个mrpack文件')
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
    logToPage('整合包解析完成')
    //创建一个新zip并复制override内容
    logToPage('开始处理非托管部分')
    let newPack = new JSZip()
    let overrideFolder = zipData.folder('override')
    let overrideFiles = []
    overrideFolder.forEach((relativePath, file) => {
        if (!relativePath.includes('/'))
            overrideFiles.push(file)
    })
    console.log(overrideFiles)
    for (let i = 0; i < overrideFiles.length; i++)
        newPack.file(removeOverride(overrideFiles[i].name), await overrideFiles[i].async('blob'))
    logToPage('非托管部分处理完成')
    //处理托管部分
    logToPage('开始处理托管部分')
    for (let i = 0; i < fileContent.files.length; i++) {
        let data = fileContent.files[i];
        logToPage(`开始处理${data.path} (${i + 1}/${fileContent.files.length})`)
        console.log(data)
        let url = data.downloads[0];
        logToPage(`开始下载：${url} (${filterSize(data.fileSize)})`)
        let success = true;
        let jarFile = await fetch(url).then(function (response) {
            if (response.status === 200 || response.status === 0) {
                return Promise.resolve(response.blob())
            } else {
                return Promise.reject(new Error(response.statusText))
            }
        }).catch(err => {
            console.log(err)
            success = false;
        })
        if (!success) {
            logToPage('加载Jar过程中出错，默认为双端Mod')
            continue;
        }
        logToPage('Jar文件下载完成')
        newPack.file(data.path, jarFile)
    }
    logToPage('托管部分处理完成')
    //保存
    console.log(newPack)
    logToPage('正在打包：' + fileName + '.zip，请稍后')
    saveAs(await newPack.generateAsync({ type: 'blob' }), fileName + '.zip')
    logToPage('打包完成')
}