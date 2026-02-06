// src/components/Calendar/index.tsx
import { View, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import './index.scss'

// 定义类型
interface CalendarDay {
  day: number | string
  date: string
  disabled: boolean
  inRange: boolean
  isStart: boolean
  isEnd: boolean
  isToday: boolean
}

interface SelectedRange {
  start: string | null
  end: string | null
}

interface CalendarProps {
  visible: boolean
  onClose: () => void
  onSelect: (startDate: string, endDate: string) => void
  minDate?: string
  maxDate?: string
}

export default function Calendar(props: CalendarProps) {
  const { 
    visible, onClose, onSelect, 
    minDate = getDateStr(0), maxDate = getDateStr(365) 
  } = props
  
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())     // 当前年份
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())      // 当前月份
  const [selectedRange, setSelectedRange] = useState<SelectedRange>(
    {
    start: null,
    end: null
  })     // 选中日期范围
  const [showWarning, setShowWarning] = useState(false)
  const [warningMessage, setWarningMessage] = useState('')

  // 获取日期字符串
  function getDateStr(days: number): string {
    const date = new Date()
    date.setDate(date.getDate() + days)        // 获取指定天数后的日期
    return date.toISOString().split('T')[0]     // 格式化日期为 yyyy-mm-dd
  }

  // 获取月份的天数
  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate()       // 获取指定月份的天数
  }

  // 获取月份第一天是周几
  const getFirstDayOfMonth = (year: number, month: number): number => {
    return new Date(year, month, 1).getDay()            // 获取指定月份的第一天是周几
  }

  // 生成月份数据
  const generateMonthData = (): CalendarDay[] => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth)
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
    const days: CalendarDay[] = []          // 存放每一天的数据
    
    // 填充前面的空白
    for (let i = 0; i < firstDay; i++) {       
      days.push({ 
        day: '', 
        date: '', 
        disabled: true, 
        inRange: false, 
        isStart: false, 
        isEnd: false, 
        isToday: false 
      })
    }
    
    // 填充当月天数
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`
      const dateObj = new Date(dateStr)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // 判断是否可选中
      const disabled = dateObj < today || dateStr < minDate || dateStr > maxDate
      
      // 判断是否在选中范围内
      let inRange = false
      let isStart = false
      let isEnd = false
      
      if (selectedRange.start && selectedRange.end) {
        const startDate = new Date(selectedRange.start)
        const endDate = new Date(selectedRange.end)
        const currentDate = new Date(dateStr)
        
        inRange = currentDate > startDate && currentDate < endDate
        isStart = dateStr === selectedRange.start
        isEnd = dateStr === selectedRange.end
      } else if (selectedRange.start && !selectedRange.end) {
        isStart = dateStr === selectedRange.start
      }
      
      const isToday = dateStr === getDateStr(0)
      
      days.push({
        day: i,
        date: dateStr,
        disabled,
        inRange,
        isStart,
        isEnd,
        isToday
      })
    }
    
    return days
  }

  // 处理日期选择
const handleDateSelect = (date: string) => {
  if (!selectedRange.start) {
    setSelectedRange({ start: date, end: null })
  } else if (!selectedRange.end) {
    const startDate = new Date(selectedRange.start)
    const endDate = new Date(date)
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    //补充：到店离店不能为同一天
    if (diffDays === 0) {
      setWarningMessage('到店和离店不能为同一天')
      setShowWarning(true)
      // 2秒后自动隐藏提示
      setTimeout(() => setShowWarning(false), 2000)
      return
    } else if (diffDays < 0) {
      // 如果选择的是更早的日期，则交换
      setSelectedRange({ start: date, end: selectedRange.start })
    } else {
      // 正常选择，至少间隔一天
      setSelectedRange({ start: selectedRange.start, end: date })
    }
  } else {
    setSelectedRange({ start: date, end: null })
  }
}

  // 月份切换
  const changeMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentYear(currentYear - 1)
        setCurrentMonth(11)
      } else {
        setCurrentMonth(currentMonth - 1)
      }
    } else {
      if (currentMonth === 11) {
        setCurrentYear(currentYear + 1)
        setCurrentMonth(0)
      } else {
        setCurrentMonth(currentMonth + 1)
      }
    }
  }

  // 确认选择
  const handleConfirm = () => {
    if (selectedRange.start && selectedRange.end) {
      onSelect(selectedRange.start, selectedRange.end)
      onClose()
    }
  }

  // 清除选择
  const handleClear = () => {
    setSelectedRange({ start: null, end: null })
  }

  // 格式化显示日期
  const formatDisplayDate = (dateStr: string | null): string => {
    if (!dateStr) return '请选择'
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  if (!visible) return null

  const monthData = generateMonthData()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

  return (
    <View className='calendar-overlay'>
      <View className='calendar-modal'>
        {/* 日历头部 */}
        <View className='calendar-header'>
          <View className='header-title'>
            <Text>选择入住日期</Text>
            {selectedRange.start && selectedRange.end && (
              <Text className='selected-info'>
                {formatDisplayDate(selectedRange.start)} - {formatDisplayDate(selectedRange.end)}
              </Text>
            )}
          </View>
          <Text className='close-btn' onClick={onClose}>×</Text>
        </View>

        {showWarning && (
        <View className='date-warning'>
          <Text>{warningMessage}</Text>
        </View>
        )}

        {/* 月份导航 */}
        <View className='month-nav'>
          <Text 
            className='nav-arrow prev' 
            onClick={() => changeMonth('prev')}
          >
            ‹
          </Text>
          <Text className='month-title'>
            {currentYear}年 {monthNames[currentMonth]}
          </Text>
          <Text 
            className='nav-arrow next' 
            onClick={() => changeMonth('next')}
          >
            ›
          </Text>
        </View>

        {/* 星期标题 */}
        <View className='week-header'>
          {weekDays.map((day, index) => (
            <Text 
              key={index} 
              className={`week-day ${index === 0 || index === 6 ? 'weekend' : ''}`}
            >
              {day}
            </Text>
          ))}
        </View>

        {/* 日期网格 */}
        <View className='date-grid'>
          {monthData.map((item: CalendarDay, index: number) => {
            let className = 'date-cell'
            if (item.disabled) className += ' disabled'
            if (item.inRange) className += ' in-range'
            if (item.isStart) className += ' start-date'
            if (item.isEnd) className += ' end-date'
            if (item.isToday) className += ' today'
            if (!item.disabled && !item.isStart && !item.isEnd) className += ' selectable'

            return (
              <View
                key={index}
                className={className}
                onClick={() => !item.disabled && handleDateSelect(item.date)}
              >
                {item.day ? (
                  <>
                    <Text className='date-number'>{item.day}</Text>
                    {item.isToday && <Text className='today-tag'>今</Text>}
                  </>
                ) : null}
              </View>
            )
          })}
        </View>

        {/* 底部操作栏 */}
        <View className='calendar-footer'>
          <View className='footer-selection'>
            <View className='selection-item'>
              <Text className='selection-label'>入住</Text>
              <Text className='selection-date'>
                {formatDisplayDate(selectedRange.start)}
              </Text>
            </View>
            <View className='selection-separator'></View>
            <View className='selection-item'>
              <Text className='selection-label'>离店</Text>
              <Text className='selection-date'>
                {formatDisplayDate(selectedRange.end)}
              </Text>
            </View>
          </View>
          
          <View className='footer-buttons'>
            <Text className='clear-btn' onClick={handleClear}>清除</Text>
            <Text 
              className={`confirm-btn ${selectedRange.start && selectedRange.end ? 'active' : ''}`}
              onClick={handleConfirm}
            >
              确定
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}