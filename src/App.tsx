import React, { useState, useEffect } from 'react'
import { Folder, File, Zap, Settings, Info, Minimize2, Square, X, CheckCircle2, Globe, Github } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ipcRenderer } from 'electron'

const NutIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M128 32L211.138 80V176L128 224L44.8615 176V80L128 32Z" stroke="currentColor" strokeWidth="16" strokeLinejoin="round"/>
    <circle cx="128" cy="128" r="40" stroke="currentColor" strokeWidth="12"/>
    <circle cx="128" cy="128" r="18" fill="currentColor"/>
    <path d="M128 32V64M128 192V224M44.8615 80H76.8615M179.138 80H211.138M44.8615 176H76.8615M179.138 176H211.138" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
  </svg>
)

const App: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('compress')
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [outputPath, setOutputPath] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  const switchTab = (tab: string) => {
    setSelectedTab(tab)
    setSelectedFiles([])
    setOutputPath('')
    setShowSuccess(false)
  }

  const [format, setFormat] = useState('.nutz')
  const [level, setLevel] = useState(6)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('nutzip-settings')
    return saved ? JSON.parse(saved) : {
      defaultFormat: '.nutz',
      defaultLevel: 6,
      autoOpenFolder: true,
      showNotifications: true,
      theme: 'dark'
    }
  })

  useEffect(() => {
    localStorage.setItem('nutzip-settings', JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    setFormat(settings.defaultFormat)
    setLevel(settings.defaultLevel)
  }, [settings.defaultFormat, settings.defaultLevel])
  
  const updateOutputPath = (files: string[], currentFormat: string) => {
    if (files.length > 0) {
      const firstFile = files[0]
      // Remove original extension if present
      const lastDotIndex = firstFile.lastIndexOf('.')
      const lastSlashIndex = Math.max(firstFile.lastIndexOf('/'), firstFile.lastIndexOf('\\'))
      
      let baseName = firstFile
      if (lastDotIndex > lastSlashIndex) {
        baseName = firstFile.substring(0, lastDotIndex)
      }
      
      setOutputPath(baseName + currentFormat)
    }
  }

  const openExternal = (url: string) => {
    ipcRenderer.send('open-external', url)
  }

  const controlWindow = (type: string) => {
    ipcRenderer.send('window-control', type)
  }

  const handleSelectFiles = async () => {
    const files = await ipcRenderer.invoke('select-file')
    if (files && files.length > 0) {
      setSelectedFiles(files)
      if (selectedTab === 'compress') {
        updateOutputPath(files, format)
      } else {
        // For extraction, suggest a folder named after the archive
        const firstFile = files[0]
        // Remove known archive extensions to get a clean folder name
        let suggestedPath = firstFile.replace(/\.(zip|tar|gz|xz|nutz)$|(\.tar\.(gz|xz))$/i, '')
        // If the path didn't change (no extension found), add _extracted to avoid conflict
        if (suggestedPath === firstFile) {
          suggestedPath += '_extracted'
        }
        setOutputPath(suggestedPath)
      }
    }
  }

  const handleSelectFolder = async () => {
    const folder = await ipcRenderer.invoke('select-folder')
    if (folder) {
      setSelectedFiles(prev => [...prev, folder])
      if (selectedTab === 'compress') {
        updateOutputPath([folder], format)
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    // @ts-ignore - path is present in Electron environment for files
    const files = Array.from(e.dataTransfer.files).map(file => (file as any).path).filter(p => !!p)
    if (files.length > 0) {
      setSelectedFiles(files)
      if (selectedTab === 'compress') {
        updateOutputPath(files, format)
      } else {
        const firstFile = files[0]
        let suggestedPath = firstFile.replace(/\.(zip|tar|gz|xz|nutz)$|(\.tar\.(gz|xz))$/i, '')
        if (suggestedPath === firstFile) {
          suggestedPath += '_extracted'
        }
        setOutputPath(suggestedPath)
      }
    }
  }

  const handleFormatChange = (newFormat: string) => {
    setFormat(newFormat)
    if (selectedFiles.length > 0) {
      updateOutputPath(selectedFiles, newFormat)
    }
  }

  const handleCompress = async () => {
    if (selectedFiles.length === 0) return
    setIsProcessing(true)
    setShowSuccess(false)
    try {
      let finalOutput = outputPath
      if (!finalOutput) {
        const firstFile = selectedFiles[0]
        const lastDotIndex = firstFile.lastIndexOf('.')
        const lastSlashIndex = Math.max(firstFile.lastIndexOf('/'), firstFile.lastIndexOf('\\'))
        let baseName = firstFile
        if (lastDotIndex > lastSlashIndex) baseName = firstFile.substring(0, lastDotIndex)
        finalOutput = baseName + format
      }

      await ipcRenderer.invoke('compress-file', {
        inputs: selectedFiles,
        output: finalOutput,
        format,
        level
      })
      
      setShowSuccess(true)
      if (settings.autoOpenFolder) {
        ipcRenderer.send('open-in-folder', finalOutput)
      }
    } catch (err) {
      alert('压缩失败: ' + err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExtract = async () => {
    if (selectedFiles.length === 0) return
    setIsProcessing(true)
    setShowSuccess(false)
    try {
      const input = selectedFiles[0]
      // Ensure output is NOT the same as input or has .nutz again
      let output = outputPath
      if (!output) {
        output = input.substring(0, input.lastIndexOf('.'))
      }
      
      await ipcRenderer.invoke('decompress-file', {
        input,
        output,
        format: input.substring(input.lastIndexOf('.'))
      })
      
      setShowSuccess(true)
      if (settings.autoOpenFolder) {
        ipcRenderer.send('open-in-folder', output)
      }
    } catch (err) {
      alert('解压失败: ' + err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSelectExtractOutput = async () => {
    const folder = await ipcRenderer.invoke('select-folder')
    if (folder) {
      setOutputPath(folder)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white rounded-xl overflow-hidden border border-slate-700">
      {/* Custom Title Bar */}
      <div className="h-10 bg-slate-800 flex items-center justify-between px-4 drag-region select-none">
        <div className="flex items-center gap-2">
          <NutIcon size={20} className="text-yellow-400" />
          <span className="font-bold tracking-tight">NutZip</span>
          <span className="text-xs text-slate-400 ml-2">by Squ4sh000</span>
        </div>
        <div className="flex items-center gap-4 no-drag-region">
          <button onClick={() => controlWindow('minimize')} className="hover:bg-slate-700 p-1 rounded-md transition-colors">
            <Minimize2 size={16} />
          </button>
          <button onClick={() => controlWindow('maximize')} className="hover:bg-slate-700 p-1 rounded-md transition-colors">
            <Square size={14} />
          </button>
          <button onClick={() => controlWindow('close')} className="hover:bg-red-500 p-1 rounded-md transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-20 bg-slate-950 flex flex-col items-center py-6 gap-8">
          <SidebarIcon 
            icon={<Zap />} 
            active={selectedTab === 'compress'} 
            onClick={() => switchTab('compress')} 
            label="压缩"
          />
          <SidebarIcon 
            icon={<Folder />} 
            active={selectedTab === 'extract'} 
            onClick={() => switchTab('extract')} 
            label="解压"
          />
          <SidebarIcon 
            icon={<Settings />} 
            active={selectedTab === 'settings'} 
            onClick={() => switchTab('settings')} 
            label="设置"
          />
          <div className="mt-auto">
            <SidebarIcon 
              icon={<Info />} 
              active={selectedTab === 'about'} 
              onClick={() => switchTab('about')} 
              label="关于"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-slate-900 p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            {selectedTab === 'compress' && (
              <motion.div 
                key="compress"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col h-full"
              >
                <h2 className="text-3xl font-bold mb-6">压缩文件</h2>
                
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 transition-all group ${isDragging ? 'border-yellow-400 bg-yellow-400/10 scale-[1.02]' : selectedFiles.length > 0 ? 'border-yellow-400/50 bg-slate-800/30' : 'border-slate-700 hover:border-yellow-400/50 hover:bg-slate-800/50'}`}
                >
                  <div className={`p-6 rounded-full transition-colors mb-4 ${isDragging || selectedFiles.length > 0 ? 'bg-yellow-400/20' : 'bg-slate-800 group-hover:bg-yellow-400/20'}`}>
                    <File className={`w-12 h-12 transition-colors ${isDragging || selectedFiles.length > 0 ? 'text-yellow-400' : 'text-slate-400 group-hover:text-yellow-400'}`} />
                  </div>
                  <p className="text-xl font-medium text-slate-300">
                    {selectedFiles.length > 0 ? `已选择 ${selectedFiles.length} 个文件/文件夹` : '拖放文件或文件夹到此处'}
                  </p>
                  
                  <div className="flex gap-4 mt-4">
                    <button 
                      onClick={handleSelectFiles}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                    >
                      选择文件
                    </button>
                    <button 
                      onClick={handleSelectFolder}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                    >
                      选择文件夹
                    </button>
                  </div>
                  
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 max-h-24 overflow-y-auto w-full px-4">
                      {selectedFiles.map((f, i) => (
                        <div key={i} className="text-xs text-slate-500 truncate text-center">{f}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                    <h3 className="font-semibold mb-4 text-slate-400 uppercase text-xs tracking-wider">压缩格式</h3>
                    <div className="flex flex-wrap gap-2">
                      {['.zip', '.tar', '.gz', '.xz', '.nutz'].map(ext => (
                        <button 
                          key={ext}
                          onClick={() => handleFormatChange(ext)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${format === ext ? 'bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/20' : 'bg-slate-700 hover:bg-slate-600'}`}
                        >
                          {ext}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                    <h3 className="font-semibold mb-4 text-slate-400 uppercase text-xs tracking-wider">压缩强度: {level}</h3>
                    <input 
                      type="range" 
                      min="1" 
                      max="9" 
                      value={level} 
                      onChange={(e) => setLevel(parseInt(e.target.value))}
                      className="w-full accent-yellow-400" 
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-2">
                      <span>快速</span>
                      <span>极致 (.nutz)</span>
                    </div>
                  </div>
                </div>

                <button 
                  disabled={selectedFiles.length === 0 || isProcessing}
                  onClick={handleCompress}
                  className={`mt-auto font-bold py-4 rounded-xl text-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${selectedFiles.length === 0 || isProcessing ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-yellow-400 hover:bg-yellow-300 text-slate-950 shadow-lg shadow-yellow-400/20'}`}
                >
                  {isProcessing ? (
                    <>
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Zap size={20} />
                      </motion.div>
                      正在压缩...
                    </>
                  ) : '立即压缩'}
                </button>

                <AnimatePresence>
                  {showSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-4 flex items-center justify-center gap-2 text-green-400 font-bold bg-green-400/10 py-2 rounded-lg border border-green-400/20"
                    >
                      <CheckCircle2 size={18} />
                      压缩任务已圆满完成！
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {selectedTab === 'extract' && (
              <motion.div 
                key="extract"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col h-full"
              >
                <h2 className="text-3xl font-bold mb-6">解压文件</h2>
                
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 transition-all group ${isDragging ? 'border-yellow-400 bg-yellow-400/10 scale-[1.02]' : selectedFiles.length > 0 ? 'border-yellow-400/50 bg-slate-800/30' : 'border-slate-700 hover:border-yellow-400/50 hover:bg-slate-800/50'}`}
                >
                  <div className={`p-6 rounded-full transition-colors mb-4 ${isDragging || selectedFiles.length > 0 ? 'bg-yellow-400/20' : 'bg-slate-800 group-hover:bg-yellow-400/20'}`}>
                    <Folder className={`w-12 h-12 transition-colors ${isDragging || selectedFiles.length > 0 ? 'text-yellow-400' : 'text-slate-400 group-hover:text-yellow-400'}`} />
                  </div>
                  <p className="text-xl font-medium text-slate-300">
                    {selectedFiles.length > 0 ? `已选择 ${selectedFiles.length} 个文件` : '拖放压缩包到此处'}
                  </p>
                  
                  <div className="flex gap-4 mt-4">
                    <button 
                      onClick={handleSelectFiles}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                    >
                      选择文件
                    </button>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="mt-4 max-h-24 overflow-y-auto w-full px-4">
                      {selectedFiles.map((f, i) => (
                        <div key={i} className="text-xs text-slate-500 truncate text-center">{f}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-8">
                  <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                    <h3 className="font-semibold mb-4 text-slate-400 uppercase text-xs tracking-wider">解压到</h3>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={outputPath} 
                        onChange={(e) => setOutputPath(e.target.value)}
                        placeholder="默认解压到当前目录"
                        className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-yellow-400"
                      />
                      <button 
                        onClick={handleSelectExtractOutput}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                      >
                        浏览
                      </button>
                    </div>
                  </div>
                </div>

                <button 
                  disabled={selectedFiles.length === 0 || isProcessing}
                  onClick={handleExtract}
                  className={`mt-auto font-bold py-4 rounded-xl text-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${selectedFiles.length === 0 || isProcessing ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-yellow-400 hover:bg-yellow-300 text-slate-950 shadow-lg shadow-yellow-400/20'}`}
                >
                  {isProcessing ? (
                    <>
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Zap size={20} />
                      </motion.div>
                      正在解压...
                    </>
                  ) : '立即解压'}
                </button>

                <AnimatePresence>
                  {showSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-4 flex items-center justify-center gap-2 text-green-400 font-bold bg-green-400/10 py-2 rounded-lg border border-green-400/20"
                    >
                      <CheckCircle2 size={18} />
                      解压任务已圆满完成！
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {selectedTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full"
              >
                <h2 className="text-3xl font-bold mb-6">软件设置</h2>
                
                <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                  <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" /> 默认压缩参数
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">默认压缩格式</span>
                        <div className="flex gap-2">
                          {['.zip', '.nutz'].map(f => (
                            <button 
                              key={f}
                              onClick={() => setSettings({...settings, defaultFormat: f})}
                              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${settings.defaultFormat === f ? 'bg-yellow-400 text-slate-950' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">默认压缩等级</span>
                        <input 
                          type="range" min="1" max="9" 
                          value={settings.defaultLevel}
                          onChange={(e) => setSettings({...settings, defaultLevel: parseInt(e.target.value)})}
                          className="w-32 accent-yellow-400"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Settings className="w-4 h-4 text-yellow-400" /> 通用设置
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">压缩完成后打开目录</span>
                        <Toggle 
                          active={settings.autoOpenFolder} 
                          onClick={() => setSettings({...settings, autoOpenFolder: !settings.autoOpenFolder})} 
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">启用系统通知</span>
                        <Toggle 
                          active={settings.showNotifications} 
                          onClick={() => setSettings({...settings, showNotifications: !settings.showNotifications})} 
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">主题风格 (深色/浅色)</span>
                        <button className="text-xs text-yellow-400 font-bold hover:underline">Dark Mode Only (Recommended)</button>
                      </div>
                    </div>
                  </section>

                  <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 opacity-50 cursor-not-allowed">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">高级实验性功能</h3>
                    <p className="text-xs text-slate-500">更多功能如“智能极速模式”、“云端压缩备份”将在后续版本推出。</p>
                  </section>

                  <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" /> 命令行工具 (CLI)
                    </h3>
                    <div className="bg-slate-950 p-4 rounded-xl font-mono text-[10px] text-slate-400 space-y-2 border border-slate-700">
                      <div className="text-yellow-400/80 mb-2"># 压缩示例</div>
                      <div>nutzip c -o archive.zip file1.txt folder1</div>
                      <div className="text-yellow-400/80 mt-4 mb-2"># 解压示例</div>
                      <div>nutzip x -i archive.nutz -o ./output</div>
                      <div className="mt-4 text-slate-500 italic">// 核心程序位于 backend/nutzip.exe</div>
                    </div>
                  </section>
                </div>
              </motion.div>
            )}

            {selectedTab === 'about' && (
              <motion.div 
                key="about"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-full text-center"
              >
                <div className="bg-yellow-400 p-8 rounded-3xl mb-6 shadow-2xl shadow-yellow-400/20 relative group">
                  <NutIcon size={80} className="text-slate-900" />
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-2 border-2 border-dashed border-yellow-400/30 rounded-3xl group-hover:border-yellow-400/60 transition-colors"
                  />
                </div>
                <h2 className="text-4xl font-black mb-2 tracking-tighter">NutZip</h2>
                <p className="text-slate-400 text-lg mb-8 italic">极致压缩，不仅是速度</p>
                <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 max-w-md relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400" />
                  <p className="text-slate-300 leading-relaxed text-left">
                    NutZip 是一款由 <span className="text-yellow-400 font-bold">Squ4sh000</span> 开发的高性能压缩工具。
                    特别支持独家 <span className="text-yellow-400">.nutz</span> 格式，旨在提供业界领先的压缩比。
                  </p>
                  
                  <div className="mt-8 pt-6 border-t border-slate-700 flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Designed by</span>
                    <motion.div 
                      className="text-xl font-bold tracking-[0.2em] text-yellow-400 italic cursor-pointer hover:text-yellow-300 transition-colors"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      onClick={() => openExternal('https://squ4sh000.github.io/')}
                    >
                      SQU4SH000
                    </motion.div>
                  </div>

                  <div className="mt-6 flex justify-center gap-4">
                    <button 
                      onClick={() => openExternal('https://squ4sh000.github.io/')}
                      className="flex items-center gap-2 text-xs text-slate-400 hover:text-yellow-400 transition-colors bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-700 hover:border-yellow-400/50"
                    >
                      <Globe size={14} />
                      个人主页
                    </button>
                    <button 
                      onClick={() => openExternal('https://github.com/Squ4sh000/NutZip')}
                      className="flex items-center gap-2 text-xs text-slate-400 hover:text-yellow-400 transition-colors bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-700 hover:border-yellow-400/50"
                    >
                      <Github size={14} />
                      GitHub 仓库
                    </button>
                  </div>

                  <div className="mt-6 text-[10px] text-slate-600">
                    Version 1.0.0 Alpha • © 2026
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <style>{`
        .drag-region { -webkit-app-region: drag; }
        .no-drag-region { -webkit-app-region: no-drag; }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }

        input[type='range'] {
          -webkit-appearance: none;
          background: transparent;
        }
        input[type='range']::-webkit-slider-runnable-track {
          width: 100%;
          height: 8px;
          cursor: pointer;
          background: #334155;
          border-radius: 4px;
        }
        input[type='range']::-webkit-slider-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #facc15;
          cursor: pointer;
          -webkit-appearance: none;
          margin-top: -6px;
        }
      `}</style>
    </div>
  )
}

interface SidebarIconProps {
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  label: string;
}

const Toggle: React.FC<{ active: boolean; onClick: () => void }> = ({ active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-12 h-6 rounded-full transition-colors relative ${active ? 'bg-yellow-400' : 'bg-slate-700'}`}
  >
    <motion.div 
      animate={{ x: active ? 26 : 2 }}
      className={`absolute top-1 w-4 h-4 rounded-full ${active ? 'bg-slate-900' : 'bg-slate-400'}`}
    />
  </button>
)

const SidebarIcon: React.FC<SidebarIconProps> = ({ icon, active, onClick, label }) => (
  <button 
    onClick={onClick}
    className={`relative group flex flex-col items-center gap-1 transition-all ${active ? 'text-yellow-400' : 'text-slate-500 hover:text-slate-300'}`}
  >
    <div className={`p-3 rounded-2xl transition-all ${active ? 'bg-slate-800 shadow-xl' : 'hover:bg-slate-900'}`}>
      {React.cloneElement(icon as React.ReactElement, { size: 24 })}
    </div>
    <span className="text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
      {label}
    </span>
    {active && (
      <motion.div 
        layoutId="activeTab"
        className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-yellow-400 rounded-full"
      />
    )}
  </button>
)

export default App
