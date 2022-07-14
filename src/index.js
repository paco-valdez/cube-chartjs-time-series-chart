import ReactDOM from "react-dom";
import cubejs from "@cubejs-client/core";
import { QueryRenderer } from "@cubejs-client/react";
import { Spin } from "antd";
import "antd/dist/antd.css";
import React from "react";
import { Line } from "react-chartjs-2";
import { useDeepCompareMemo } from "use-deep-compare";
import "chartjs-adapter-moment";
// import * as ChartAnnotation from "chartjs-plugin-annotation";

const COLORS_SERIES = [
  "#5b8ff9",
  "#5ad8a6",
  "#5e7092",
  "#f6bd18",
  "#6f5efa",
  "#6ec8ec",
  "#945fb9",
  "#ff9845",
  "#299796",
  "#fe99c3"
];
const commonOptions = {
  animation: {
    duration: 0
  },
  maintainAspectRatio: false,
  interaction: {
    intersect: false
  },
  parsing: false,
  plugins: {
    autocolors: false,
    legend: {
      position: "bottom"
    }
    // annotation: {
    //   annotations: {
    //     line1: {
    //       type: "line",
    //       yMin: 0.07,
    //       yMax: 0.07,
    //       borderColor: "rgb(255, 99, 132)",
    //       borderWidth: 2,
    //     }
    //   }
    // }
    // decimation: {
    //   enabled: true,
    //   algorithm: "min-max"
    // }
  },
  scales: {
    x: {
      type: "time"
      // ticks: {
      //   //beginAtZero: true,
      //   autoSkip: true,
      //   maxRotation: 0,
      //   padding: 12,
      //   minRotation: 0
      // }
    },
    y: {
      suggestedMin: 0.0,
      suggestedMax: 0.08
    }
  }
};

const useDrilldownCallback = ({
  datasets,
  labels,
  onDrilldownRequested,
  pivotConfig
}) => {
  return React.useCallback(
    (elements) => {
      if (elements.length <= 0) return;
      const { datasetIndex, index } = elements[0];
      const { yValues } = datasets[datasetIndex];
      const xValues = [labels[index]];

      if (typeof onDrilldownRequested === "function") {
        onDrilldownRequested(
          {
            xValues,
            yValues
          },
          pivotConfig
        );
      }
    },
    [datasets, labels, onDrilldownRequested]
  );
};

const LineChartRenderer = ({
  resultSet,
  pivotConfig,
  onDrilldownRequested
}) => {
  console.log(resultSet);
  const datasets = useDeepCompareMemo(
    () =>
      resultSet.series(pivotConfig).map((s, index) => ({
        type: "line",
        label: s.title,
        data: s.series.map((r) => ({ x: new Date(r.x + "Z"), y: r.value })),
        borderColor: COLORS_SERIES[index],
        pointRadius: 0.0,
        //tension: 0.1,
        pointHoverRadius: 1,
        borderWidth: 0.5,
        tickWidth: 1,
        fill: false,
        indexAxis: "x",
        parsing: false
      })),
    [resultSet]
  );
  const data = {
    labels: resultSet.categories(pivotConfig).map((c) => c.x),
    datasets
  };
  const getElementAtEvent = useDrilldownCallback({
    datasets: data.datasets,
    labels: data.labels,
    onDrilldownRequested
  });
  console.log(data);
  return (
    <Line
      type="line"
      data={data}
      options={commonOptions}
      getElementAtEvent={getElementAtEvent}
      // plugins={[ChartAnnotation]}
    />
  );
};

const cubejsApi = cubejs(
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2NTc4MzczMTZ9.8TlfjIM8iPUXhjAvNCb63pwTQdFaASapCzG6Vb-miiQ",
  { apiUrl: "https://fast-coyote.aws-us-west-2.cubecloudapp.dev/cubejs-api/v1" }
);

const renderChart = ({
  resultSet,
  error,
  pivotConfig,
  onDrilldownRequested
}) => {
  if (error) {
    return <div>{error.toString()}</div>;
  }

  if (!resultSet) {
    return <Spin />;
  }

  return (
    <LineChartRenderer
      resultSet={resultSet}
      pivotConfig={pivotConfig}
      onDrilldownRequested={onDrilldownRequested}
    />
  );
};

const ChartRenderer = () => {
  return (
    <QueryRenderer
      query={{
        measures: ["FiveMinAgg.avgValue"],
        dimensions: ["FiveMinAgg.tagName"],
        timeDimensions: [
          {
            dimension: "FiveMinAgg.timestamp",
            granularity: "minute",
            dateRange: "Last 30 days"
          }
        ],
        order: {
          "FiveMinAgg.timestamp": "asc"
        },
        filters: [
          {
            member: "FiveMinAgg.tagName",
            operator: "equals",
            values: [
              "DXM7_L1BlowerPreformInfeedRoller1D_XAxisPeakAcceleration_PV_scaled"
            ]
          },
          {
            member: "FiveMinAgg.deviceName",
            operator: "equals",
            values: ["DXM_V1_Central_7"]
          }
        ]
      }}
      cubejsApi={cubejsApi}
      resetResultSetOnChange={false}
      render={(props) =>
        renderChart({
          ...props,
          chartType: "line",
          pivotConfig: {
            x: ["FiveMinAgg.timestamp.minute"],
            y: ["FiveMinAgg.tagName", "measures"],
            fillMissingDates: false,
            joinDateRange: false
          }
        })
      }
    />
  );
};

const rootElement = document.getElementById("root");
ReactDOM.render(<ChartRenderer />, rootElement);
