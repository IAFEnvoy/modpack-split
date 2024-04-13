const logToPage = (content) => {
    let obj = document.getElementById('logs');
    obj.innerHTML += content + '\n';
    obj.scrollTop = obj.scrollHeight
}

const analyze0 = (data) => {
    logToPage('错误报告读取成功')
    let stacks = JavaStackTrace.parseFirst(data)
    console.log(stacks)
    if (stacks) {
        logToPage('错误解析成功')
        parse(stacks, logToPage, document.getElementById('details').checked)
    }
}

const analyze = async () => {
    document.getElementById('logs').innerHTML = ''
    let mclogs = document.getElementById('mclo-gs').value
    if (mclogs.startsWith('https://mclo.gs/')) {
        mclogs = mclogs.replace('https://mclo.gs/', '')
        await fetch('https://api.mclo.gs/1/raw/' + mclogs).then(res => res.text()).then(text => {
            try {
                JSON.parse(text)
                alert('此mclo.gs链接无效')
            } catch {
                analyze0(text)
            }
        })
        return
    }
    let fileInput = document.getElementById('local-file')
    let file = fileInput.files[0]
    if (!file)
        return alert('请选择一个txt文件')
    let reader = new FileReader()
    reader.onload = e => analyze0(e.target.result)
    reader.readAsText(file, "utf-8")
}