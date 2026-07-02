library(shiny)
library(plotly)

ui <- fluidPage(
  tags$head(
    tags$style(HTML("
      body {
        overflow-x: hidden;
      }
      .container-fluid {
        overflow-x: auto !important;
      }
      .irs {
        overflow-x: auto !important;
      }
    "))
  ),
  titlePanel("you are awesome"),
  sidebarLayout(
    sidebarPanel(
      sliderInput("bins",
                  "Number of bins:",
                  min = 1,
                  max = 50,
                  value = 15),
      textInput("title", "Plot Title:", "Histogram of Old Faithful Geyser Data")
    ),
    mainPanel(
      tabsetPanel(
        type = "pills",
        tabPanel("Histogram",
                 plotlyOutput("distPlot"),
                 textOutput("infoText")),
        tabPanel("Scatter Plot",
                 plotOutput("scatterPlot"))
      )
    )
  )
)

server <- function(input, output) {
  output$distPlot <- renderPlotly({
    x <- faithful$waiting
    plot_ly(x = x, type = "histogram", nbinsx = input$bins, marker = list(color = "red")) %>%
      layout(title = input$title,
             xaxis = list(title = "Waiting time to next eruption (in mins)"),
             yaxis = list(title = "Count"),
             hovermode = "closest")
  })

  output$infoText <- renderText({
    paste("Currently displaying a histogram with", input$bins, "bins.")
  })

  output$scatterPlot <- renderPlot({
    plot(faithful$waiting, faithful$eruptions,
         col = "steelblue", pch = 19,
         xlab = "Waiting time to next eruption (mins)",
         ylab = "Eruption duration (mins)",
         main = "Geyser Eruption Duration vs Waiting Time")
  })
}

# Run the application
shinyApp(ui = ui, server = server)
