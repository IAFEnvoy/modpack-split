const logToPage = (content) => {
    let obj = document.getElementById('logs');
    obj.innerHTML += content + '\n';
    obj.scrollTop = obj.scrollHeight
}

const analyze = async () => {
    const fileInput = document.getElementById('local-file')
    const file = fileInput.files[0]
    if (!file)
        return alert('请选择一个txt文件')

    const reader = new FileReader();
    reader.onload = e => {
        console.log(parseStackTrace(e.target.result))
    };
    reader.readAsText(file,"utf-8");
}